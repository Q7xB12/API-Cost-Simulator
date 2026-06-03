# API Cost Simulator

A lightweight tool for developers and founders to estimate API costs before launch. It helps answer the painful scaling question: "This looks cheap now, but what happens when usage grows?"

## Features

- Enter editable API pricing rules for multiple providers
- Estimate monthly users, actions, units per action, and storage
- Simulate best, normal, and worst case usage
- Flag dangerous pricing when worst case exceeds budget
- Compare providers side by side
- Calculate break-even price per user
- Export estimates as CSV

## Run Locally

This MVP is a static app with no build step.

Open `index.html` directly in your browser:

```text
file:///D:/miso/index.html
```

Or, from this folder, start any static server you like.

## Files

- `index.html` - app structure and editable inputs
- `styles.css` - dashboard layout and responsive styling
- `app.js` - pricing engine, scenarios, chart, alerts, and CSV export

## Pricing Model

Each provider supports:

- Base monthly fee
- Unit price
- Included units
- Storage price per GB
- Free storage allowance
- Markup buffer percentage

Monthly cost is estimated as:

```text
base fee
+ max(0, billable units - included units) * unit price
+ max(0, storage GB - free storage GB) * storage price
+ markup buffer
```

