import { unstable_createComponent } from "../utils/createComponent";
import { unstable_useHook } from "../system/useHook";
import { useDialogState, unstable_DialogStateReturn } from "./useDialogState";
import {
  unstable_HiddenShowOptions,
  unstable_HiddenShowProps,
  useHiddenShow
} from "../hidden/HiddenShow";

export type unstable_DialogShowOptions = unstable_HiddenShowOptions &
  Partial<unstable_DialogStateReturn>;

export type unstable_DialogShowProps = unstable_HiddenShowProps;

export function useDialogShow(
  options: unstable_DialogShowOptions,
  htmlProps: unstable_DialogShowProps = {}
) {
  htmlProps = useHiddenShow(options, htmlProps);
  htmlProps = unstable_useHook("useDialogShow", options, htmlProps);
  return htmlProps;
}

const keys: Array<keyof unstable_DialogShowOptions> = [
  ...useHiddenShow.keys,
  ...useDialogState.keys
];

useDialogShow.keys = keys;

export const DialogShow = unstable_createComponent("button", useDialogShow);