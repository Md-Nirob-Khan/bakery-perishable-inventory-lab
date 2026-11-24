# Crumb & Ledger — Perishable Bakery Inventory Lab

An interactive Production and Inventory Control simulator modeling daily bakery production with multi-day shelf life, FIFO issuing, day-old markdown pricing, fresh-only customer segmentation, and Holt-Winters weekday demand forecasting. Compare the classical age-blind **Simple Newsvendor** policy against an **Age-Aware Order-Up-To** policy across Monte Carlo trials.

**Live Demo:** https://md-nirob-khan.github.io/bakery-perishable-inventory-lab/

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

To create a production build:

```bash
npm run build
```
