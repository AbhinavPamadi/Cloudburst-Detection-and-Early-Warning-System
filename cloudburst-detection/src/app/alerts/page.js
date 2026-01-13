// src/app/alerts/page.js
"use client";

import { useState, useEffect } from "react";
import { database, ref, onValue, update, set, get } from "@/lib/firebase";
import { formatDateTime, generateId } from "@/lib/utils";
import { sendSMSNotification, sendInAppNotification, getSMSStatus } from "@/lib/notifications";
import { AlertTriangle, CheckCircle, XCircle, Send, Bell, MessageSquare, Search } from "lucide-react";
import ProtectedPage from "@/features/auth/ProtectedPage";
import { Roles } from "@/features/auth/authService";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [nodes, setNodes] = useState({});
  const [contacts, setContacts] = useState({});
  const [filter, setFilter] = useState("all"); // all, active, acknowledged
  const [showManualAlert, setShowManualAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [smsStatus, setSmsStatus] = useState(null);

  // Enhanced alert form state with multiple nodes support
  const [alertForm, setAlertForm] = useState({
    message: '',
    severity: 'warning',
    affectedNodes: [],
    sendSMS: false
  });
  const [recipients, setRecipients] = useState([]);
  const [nodeSearchInAlert, setNodeSearchInAlert] = useState('');

  // Check SMS configuration status
  useEffect(() => {
    const checkSMSStatus = async () => {
      const status = await getSMSStatus();
      setSmsStatus(status);
      console.log('📱 SMS Configuration Status:', status);
    };
    checkSMSStatus();
  }, []);

  useEffect(() => {
    // Load alerts
    const alertsRef = ref(database, "alerts");
    const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const alertsArray = Object.entries(data)
        .map(([id, alert]) => ({
          id,
          ...alert,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setAlerts(alertsArray);
    });

    // Load nodes
    const nodesRef = ref(database, "nodes");
    const unsubscribeNodes = onValue(nodesRef, (snapshot) => {
      setNodes(snapshot.val() || {});
    });

    // Load contacts
    const contactsRef = ref(database, "contacts");
    const unsubscribeContacts = onValue(contactsRef, (snapshot) => {
      setContacts(snapshot.val() || {});
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeNodes();
      unsubscribeContacts();
    };
  }, []);

  // Calculate recipients when affected nodes change
  useEffect(() => {
    if (alertForm.affectedNodes.length === 0) {
      setRecipients([]);
      return;
    }

    const affectedContacts = Object.values(contacts).filter(contact =>
      contact.associatedNodes?.some(nodeId => 
        alertForm.affectedNodes.includes(nodeId)
      )
    );

    setRecipients(affectedContacts);
  }, [alertForm.affectedNodes, contacts]);

  // Show toast notification
  const showToast = (type, message) => {
    setMessage({ show: true, type, message });
    setTimeout(() => setMessage({ show: false, type: '', message: '' }), 5000);
  };

  // Helper functions for node selection
  const toggleNodeSelection = (nodeId) => {
    setAlertForm(prev => ({
      ...prev,
      affectedNodes: prev.affectedNodes.includes(nodeId)
        ? prev.affectedNodes.filter(id => id !== nodeId)
        : [...prev.affectedNodes, nodeId]
    }));
  };

  const selectAllNodes = () => {
    setAlertForm(prev => ({
      ...prev,
      affectedNodes: Object.keys(nodes)
    }));
  };

  const deselectAllNodes = () => {
    setAlertForm(prev => ({
      ...prev,
      affectedNodes: []
    }));
  };

  // Filter nodes for alert form based on search
  const filteredNodesForAlert = Object.entries(nodes).filter(([nodeId, node]) => {
    const searchLower = nodeSearchInAlert.toLowerCase();
    const nodeName = node.metadata?.name?.toLowerCase() || '';
    return nodeId.toLowerCase().includes(searchLower) || nodeName.includes(searchLower);
  });

  // Enhanced alert creation with multiple nodes and SMS support
  const handleCreateAlert = async (e) => {
    e.preventDefault();

    if (alertForm.message.length > 500) {
      showToast('error', 'Message must be 500 characters or less');
      return;
    }

    if (alertForm.affectedNodes.length === 0) {
      showToast('error', 'Please select at least one node');
      return;
    }

    try {
      console.log('🚨 Creating alert...');
      const alertId = generateId('alert');
      const recipientPhones = recipients.map(c => c.phone);
      const now = Date.now();

      const alertDataToSave = {
        id: alertId,
        type: 'manual',
        severity: alertForm.severity,
        message: alertForm.message,
        affectedNodes: alertForm.affectedNodes,
        timestamp: now,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        sentSMS: alertForm.sendSMS,
        smsSentAt: alertForm.sendSMS ? now : null,
        recipients: recipientPhones,
        createdBy: 'alerts_page',
        source: 'alerts_page'
      };

      console.log('📤 Alert data:', alertDataToSave);

      // Save alert to Firebase
      await set(ref(database, `alerts/${alertId}`), alertDataToSave);
      console.log('✅ Alert saved to Firebase with ID:', alertId);

      // Verify alert was saved
      const verifySnapshot = await get(ref(database, `alerts/${alertId}`));
      if (!verifySnapshot.exists()) {
        throw new Error('Alert created but verification failed');
      }
      console.log('✅ Alert verified in database');

      // Update affected nodes with alert reference
      for (const nodeId of alertForm.affectedNodes) {
        const nodeAlertRef = ref(database, `nodes/${nodeId}/alerts/${alertId}`);
        await set(nodeAlertRef, {
          alertId,
          severity: alertForm.severity,
          timestamp: now,
          acknowledged: false
        });
        console.log(`✅ Alert linked to node: ${nodeId}`);
      }

      // Log the alert creation
      const logId = generateId('log');
      await set(ref(database, `logs/${logId}`), {
        id: logId,
        type: 'alert_triggered',
        message: `Manual alert created affecting ${alertForm.affectedNodes.length} node(s): "${alertForm.message.substring(0, 50)}${alertForm.message.length > 50 ? '...' : ''}"`,
        timestamp: now,
        metadata: { 
          alertId, 
          affectedNodes: alertForm.affectedNodes,
          severity: alertForm.severity,
          recipients: recipientPhones.length
        }
      });
      console.log('✅ Alert logged in system logs');

      // Send notifications
      let smsResult = null;
      if (alertForm.sendSMS && recipientPhones.length > 0) {
        console.log('📱 Sending SMS notifications...');
        smsResult = await sendSMSNotification({
          recipients: recipientPhones,
          message: `[${alertForm.severity.toUpperCase()}] ${alertForm.message}`,
          alertId,
          severity: alertForm.severity
        });
        
        if (smsResult.success) {
          console.log('✅ SMS notifications sent successfully');
          showToast('success', `SMS sent to ${smsResult.recipients} recipient(s)!`);
        } else if (!smsResult.configured) {
          console.log('⚠️ SMS service not configured - notification logged');
          showToast('warning', 'SMS service not configured. Notification logged for future delivery.');
        } else {
          console.log('❌ SMS send failed:', smsResult.error);
          showToast('error', 'Failed to send SMS: ' + smsResult.message);
        }
      }
      
      // Create in-app notification
      console.log('🔔 Creating in-app notification...');
      const inAppResult = await sendInAppNotification({
        alertId,
        message: alertForm.message,
        severity: alertForm.severity,
        affectedNodes: alertForm.affectedNodes
      });
      
      if (inAppResult.success) {
        console.log('✅ In-app notification created');
      }

      // Show success message
      const successMessage = smsResult?.success 
        ? `Alert created and SMS sent to ${recipientPhones.length} recipient(s)! ${alertForm.affectedNodes.length} node(s) affected.`
        : `Alert created successfully! ${alertForm.affectedNodes.length} node(s) affected, ${recipientPhones.length} contact(s) identified.`;
      
      showToast('success', successMessage);

      // Reset form
      setAlertForm({ message: '', severity: 'warning', affectedNodes: [], sendSMS: false });
      setShowManualAlert(false);

      // Show confirmation
      const viewAlerts = window.confirm(
        `Alert created successfully!\n\n` +
        `ID: ${alertId}\n` +
        `Severity: ${alertForm.severity.toUpperCase()}\n` +
        `Affected Nodes: ${alertForm.affectedNodes.length}\n` +
        `Recipients: ${recipientPhones.length}\n\n` +
        `Alert is already visible in the list below.`
      );

    } catch (error) {
      console.error('❌ Alert creation failed:', error);
      showToast('error', `Failed to create alert: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "active") return !alert.acknowledged;
    if (filter === "acknowledged") return alert.acknowledged;
    return true;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return (
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        );
      default:
        return (
          <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        );
    }
  };

  return (
    <ProtectedPage allowedRoles={[Roles.ADMIN, Roles.USER]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Alerts & Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Monitor and manage system alerts
              </p>
            </div>
            <button
              onClick={() => setShowManualAlert(!showManualAlert)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              Send Manual Alert
            </button>
          </div>

          {message.text && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
                  : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Manual Alert Form */}
          {showManualAlert && (
            <section className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">How Alerts Work</h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        <li>✅ Alerts are saved to Firebase database instantly</li>
                        <li>✅ All affected nodes will be linked to this alert</li>
                        <li>✅ Emergency contacts for selected nodes will be identified</li>
                        <li>✅ In-app notifications created for dashboard</li>
                        <li>✅ Appear immediately in the alerts list below</li>
                      </ul>

                      {/* SMS Status */}
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-semibold text-blue-900 dark:text-blue-200">SMS Notification Status:</span>
                        </div>
                        {smsStatus && (
                          <div className="text-sm">
                            {smsStatus.configured ? (
                              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                <span>✅ SMS service is configured and ready</span>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>⚠️ SMS service not configured</span>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded p-2 text-orange-800 dark:text-orange-300">
                                  <p className="font-semibold mb-1">SMS notifications will be logged only</p>
                                  <p className="text-xs">To enable actual SMS sending, configure Twilio in your environment variables.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreateAlert} className="space-y-4">
                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      value={alertForm.message}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
                      required
                      maxLength={500}
                      rows={4}
                      placeholder="Enter alert message..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {alertForm.message.length}/500 characters
                    </p>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Severity *
                    </label>
                    <select
                      value={alertForm.severity}
                      onChange={(e) => setAlertForm(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="warning">⚠️ Warning</option>
                      <option value="critical">🔴 Critical</option>
                    </select>
                  </div>

                  {/* Affected Nodes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Affected Nodes * ({alertForm.affectedNodes.length} selected)
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={selectAllNodes}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Select All
                        </button>
                        <span className="text-gray-400 dark:text-gray-500">|</span>
                        <button
                          type="button"
                          onClick={deselectAllNodes}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Deselect All
                        </button>
                      </div>

                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <input
                            type="text"
                            placeholder="Search nodes..."
                            value={nodeSearchInAlert}
                            onChange={(e) => setNodeSearchInAlert(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {filteredNodesForAlert.map(([nodeId, node]) => (
                          <label key={nodeId} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={alertForm.affectedNodes.includes(nodeId)}
                              onChange={() => toggleNodeSelection(nodeId)}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-200">
                              {node.metadata?.name || nodeId}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">({nodeId})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recipients */}
                  {recipients.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recipients ({recipients.length})
                      </label>
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 max-h-32 overflow-y-auto">
                        {recipients.map((contact, idx) => (
                          <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {contact.name} ({contact.phone})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Send SMS */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={alertForm.sendSMS}
                        onChange={(e) => setAlertForm(prev => ({ ...prev, sendSMS: e.target.checked }))}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Send SMS to recipients</span>
                    </label>
                    {alertForm.sendSMS && recipients.length > 0 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 ml-6">
                        ⚠️ This will send SMS to {recipients.length} recipient(s)
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      <Bell className="h-4 w-4" />
                      {loading ? "Creating..." : "Create & Send Alert"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertForm({ message: '', severity: 'warning', affectedNodes: [], sendSMS: false })}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Reset Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualAlert(false)}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* Filter Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
            <div className="flex border-b dark:border-gray-700">
              <button
                onClick={() => setFilter("all")}
                className={`px-6 py-3 font-medium ${
                  filter === "all"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                All Alerts ({alerts.length})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`px-6 py-3 font-medium ${
                  filter === "active"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Active ({alerts.filter((a) => !a.acknowledged).length})
              </button>
              <button
                onClick={() => setFilter("acknowledged")}
                className={`px-6 py-3 font-medium ${
                  filter === "acknowledged"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Acknowledged ({alerts.filter((a) => a.acknowledged).length})
              </button>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-500 dark:text-gray-400">
                No alerts found
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                    alert.severity === "critical"
                      ? "border-red-600 dark:border-red-500"
                      : "border-yellow-600 dark:border-yellow-500"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getSeverityIcon(alert.severity)}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {alert.type === "manual" ? "Manual" : "Automatic"}
                        </span>
                        {alert.acknowledged && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Acknowledged
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {nodes[alert.nodeId]?.metadata?.name || alert.nodeId}
                      </h3>

                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {alert.message}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Time:</span>{" "}
                          {formatDateTime(alert.timestamp)}
                        </div>
                        {alert.recipients && alert.recipients.length > 0 && (
                          <div>
                            <span className="font-medium">Recipients:</span>{" "}
                            {alert.recipients.length} contact(s)
                          </div>
                        )}
                        {alert.acknowledged && (
                          <div>
                            <span className="font-medium">
                              Acknowledged by:
                            </span>{" "}
                            {alert.acknowledgedBy} at{" "}
                            {formatDateTime(alert.acknowledgedAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
