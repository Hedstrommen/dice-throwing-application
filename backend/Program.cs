using System.Security.Cryptography;
using DiceThrower.Backend;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Serve the static site (index.html, script.js, ...) from the repository root.
var siteRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, ".."));
app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(siteRoot),
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(siteRoot),
});

// Back end math: roll `amount` dice of `sides` sides, limited to 10 dice.
app.MapGet("/api/roll", (int amount, int sides) =>
{
    if (amount < 1 || amount > 10)
    {
        return Results.BadRequest(new { error = "amount must be a whole number from 1 to 10." });
    }
    if (!DiceTypes.IsValid(sides))
    {
        return Results.BadRequest(new { error = $"sides must be a whole number from 1 to {DiceTypes.MaxSides}." });
    }

    var results = Enumerable.Range(0, amount)
        .Select(_ => RandomNumberGenerator.GetInt32(1, sides + 1))
        .ToArray();

    return Results.Ok(new { amount, sides, results, total = results.Sum() });
});

app.Run();
