namespace DiceThrower.Backend;

public static class DiceTypes
{
    public const int MaxSides = 1000000;

    public static bool IsValid(int sides) => sides >= 1 && sides <= MaxSides;
}
