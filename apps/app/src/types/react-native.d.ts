import "react-native";
import type { PressableStateCallbackType } from "react-native";

declare module "react-native" {
  interface PressableStateCallbackType {
    hovered?: boolean;
    focused?: boolean;
  }
}
