# gateway_schemdraw.py
# Draws NodeMCU + RA-02 + BME280 wiring using Schemdraw
# Usage: pip install schemdraw
#        python gateway_schemdraw.py
# Output: gateway_diagram.png (and opens inline if run in notebook)

import schemdraw
import schemdraw.elements as elm

def draw_gateway(outfile="gateway_diagram.png"):
    d = schemdraw.Drawing(show=False, fontsize=12)

    # Title
    d += elm.Label().label('Gateway: NodeMCU ESP8266 + RA-02 (433MHz) + BME280 (I2C)', loc='top', fontsize=14)

    # NodeMCU box (left)
    node_x, node_y = -4.5, 0
    d.push()
    d.origin = (node_x, node_y)
    d += elm.RBox(w=3.6, h=4.2).label('U1\nNodeMCU ESP8266', loc='top')
    pins = [
        '3V3', 'GND', 'D1\n(GPIO5)', 'D2\n(GPIO4)', 'D3\n(GPIO0)',
        'D4\n(GPIO2)', 'D5\n(GPIO14)', 'D6\n(GPIO12)', 'D7\n(GPIO13)', 'D8\n(GPIO15)', 'USB_VBUS'
    ]
    # draw pin labels inside the NodeMCU box
    y = 1.3
    for p in pins:
        d += elm.Label().at((node_x - 3.2 + 0.15, node_y + y)).label(f'- {p}', fontsize=10)
        y -= 0.35
    d.pop()

    # BME280 box (top-right)
    bme_x, bme_y = 1.5, 1.2
    d += elm.RBox(w=2, h=1.8).at((bme_x, bme_y)).label('U2\nBME280 (I2C)', loc='top')
    d += elm.Label().at((bme_x + 0.1, bme_y - 0.3)).label('- VCC (3.3V)', fontsize=10)
    d += elm.Label().at((bme_x + 0.1, bme_y - 0.6)).label('- GND', fontsize=10)
    d += elm.Label().at((bme_x + 0.1, bme_y - 0.9)).label('- SCL -> D1 (GPIO5)', fontsize=10)
    d += elm.Label().at((bme_x + 0.1, bme_y - 1.2)).label('- SDA -> D3 (GPIO0)', fontsize=10)

    # LoRa RA-02 box (bottom-right)
    lora_x, lora_y = 1.5, -1.6
    d += elm.RBox(w=2, h=2.8).at((lora_x, lora_y)).label('U3\nRA02 LoRa', loc='top')
    lora_lines = [
        '- VCC (3.3V)',
        '- GND',
        '- MISO -> D6 (GPIO12)',
        '- MOSI -> D7 (GPIO13)',
        '- SCK  -> D5 (GPIO14)',
        '- NSS  -> D8 (GPIO15)',
        '- RST  -> D4 (GPIO2)',
        '- DIO0 -> D2 (GPIO4)',
        '- ANT  -> Antenna'
    ]
    yy = lora_y - 0.3
    for line in lora_lines:
        d += elm.Label().at((lora_x + 0.1, yy)).label(line, fontsize=10)
        yy -= 0.25

    # Draw wires (approx positions)
    # 3.3V rails (red-ish)
    d += elm.Line().at((node_x + 1.8, node_y + 0.9)).to((bme_x - 0.2, bme_y - 0.25)).label('3.3V', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y + 0.6)).to((lora_x - 0.2, lora_y + 0.45)).label('3.3V', fontsize=10)

    # GND rails
    d += elm.Line().at((node_x + 1.8, node_y + 0.4)).to((bme_x - 0.2, bme_y - 0.55)).label('GND', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y + 0.1)).to((lora_x - 0.2, lora_y + 0.15)).label('GND', fontsize=10)

    # I2C lines (SCL and SDA)
    d += elm.Line().at((node_x + 1.8, node_y + 1.15)).to((bme_x - 0.2, bme_y + 0.05)).label('SCL -> D1', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y + 0.75)).to((bme_x - 0.2, bme_y - 0.15)).label('SDA -> D3', fontsize=10)

    # SPI/control lines to LoRa
    d += elm.Line().at((node_x + 1.8, node_y - 0.25)).to((lora_x - 0.2, lora_y + 0.05)).label('MISO -> D6', loc='middle', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y - 0.55)).to((lora_x - 0.2, lora_y - 0.25)).label('MOSI -> D7', loc='middle', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y - 0.85)).to((lora_x - 0.2, lora_y - 0.55)).label('SCK -> D5', loc='middle', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y - 1.15)).to((lora_x - 0.2, lora_y - 0.85)).label('NSS -> D8', loc='middle', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y - 1.45)).to((lora_x - 0.2, lora_y - 1.15)).label('RST -> D4', loc='middle', fontsize=10)
    d += elm.Line().at((node_x + 1.8, node_y - 1.75)).to((lora_x - 0.2, lora_y - 1.45)).label('DIO0 -> D2', loc='middle', fontsize=10)

    # Antenna stub
    d += elm.Line().at((lora_x + 1.6, lora_y - 1.6)).to((lora_x + 2.2, lora_y - 1.6)).label('Antenna', loc='end', fontsize=10)

    # Export
    d.draw()
    d.save(outfile)
    print(f"Saved diagram to: {outfile}")

if __name__ == "__main__":
    draw_gateway("gateway_diagram.png")
