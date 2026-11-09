namespace DiceThrower.Backend;

public static class DiceTypes
{
    public static readonly int[] ValidSides = { 2, 4, 6, 8, 10, 12, 20 };

    public static bool IsValid(int sides) => ValidSides.Contains(sides);
}
