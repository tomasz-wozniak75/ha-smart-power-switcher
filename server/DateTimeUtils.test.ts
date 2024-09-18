import { DateTimeUtils } from "./DateTimeUtils";



test("DateTimeUtils.cutOffTime should cut off time, part 1", () => {
    expect(DateTimeUtils.cutOffTime(new Date (2024, 9, 18, 17, 5).getTime())).toBe(new Date (2024,9,18).getTime());
});

test("DateTimeUtils.cutOffTime should cut off time, part 2", () => {
    expect(DateTimeUtils.cutOffTime(new Date (2024, 9, 18, 17, 5).getTime())).not.toBe(new Date (2024, 9, 18, 17, 5).getTime());
});

