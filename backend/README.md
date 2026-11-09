# Dice thrower — C# back end

ASP.NET Core minimal API on .NET 10 (LTS, released November 2025) that serves
the static site and provides the back end roll math.

## Run

```sh
dotnet run --project backend
```

Then open http://localhost:5000 — the site is served from the repository root.

## API

`GET /api/roll?amount=3&sides=6`

```json
{ "amount": 3, "sides": 6, "results": [4, 2, 6], "total": 12 }
```

- `amount`: whole number of dice, 1–10 (limited to 10 dice).
- `sides`: any whole number from 1 to 1,000,000. Classic die types (2, 4, 6, 8, 10, 12, 20) get their real shape in the front end; anything else is rolled as 1..sides on the closest real die.

Rolls use `System.Security.Cryptography.RandomNumberGenerator`.
