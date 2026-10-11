<p align="center">
  <img src="static/brand/sapling-logo.png" alt="Sapling" width="440" />
</p>

<p align="center"><strong>Plant the next move.</strong></p>

<p align="center">
  Explore how business investments affect operations, cash flow, and long-term value.
</p>

---

Sapling helps business owners compare investment plans before committing. Model hiring, marketing, vehicles, equipment, and expenses over five years, then explore the tradeoffs through financial timelines and Monte Carlo risk simulations.

- **Build plans** and compare them with doing nothing new.
- **Follow the impact** on capacity, revenue, cash, debt, and estimated owner value.
- **Explore uncertainty** with a 100-path risk preview or a 2,000-path simulation for supported example businesses.
- **Import company workbooks** and review their inputs before creating a forecast.

Built for **Hack Midwest 2026** with SvelteKit, TypeScript, and Zod.

## Run locally

Use Node.js 24+ and npm 11.

```sh
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173).

To run the built demo with example-business risk simulations enabled:

```sh
# macOS / Linux
OPERATOROS_MC_REVIEW=1 npm run demo
```

```powershell
# Windows PowerShell
$env:OPERATOROS_MC_REVIEW = '1'
npm run demo
```

The built demo runs at [localhost:4182](http://localhost:4182). See the [demo runbook](docs/DEMO_RUNBOOK.md) for company-import setup on macOS/Linux. Durable company intake is not supported on Windows. Plan edits reset on page reload.

## Development

```sh
npm test
npm run check
npm run build
```

See the [project specification](docs/OperatorOS_Implementation_Spec.md) and [stack decisions](docs/STACK_DECISION.md) for implementation details.

*Forecasts depend on the inputs and assumptions entered. Example risk results use synthetic assumptions and are exploratory estimates, not guaranteed outcomes.*
