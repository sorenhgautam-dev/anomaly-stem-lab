import type { LabModels } from "../types";
import { gearWrongModels, realGears } from "./gears";
import { realRobot, robotWrongModels } from "./kinematics";
import { pwmWrongModels, realPwm } from "./pwm";

/** Robot, gears and PWM stages (robotics lab), plus their wrong models. Each stage file documents its readings. */
export const robotModels: LabModels = {
  stages: { robot: realRobot, gears: realGears, pwm: realPwm },
  wrongModels: { ...robotWrongModels, ...gearWrongModels, ...pwmWrongModels },
};
