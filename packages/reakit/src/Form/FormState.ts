import * as React from "react";
import { ArrayValue } from "../__utils/types";
import { useUpdateEffect } from "../__utils/useUpdateEffect";
import {
  unstable_SealedInitialState,
  unstable_useSealedState
} from "../utils/useSealedState";
import { unstable_useId } from "../utils/useId";
import { isPromise } from "../__utils/isPromise";
import { isEmpty } from "../__utils/isEmpty";
import { DeepPartial, DeepMap, DeepPath, DeepPathValue } from "./__utils/types";
import { filterAllEmpty } from "./__utils/filterAllEmpty";
import { hasMessages } from "./__utils/hasMessages";
import { unstable_setAllIn } from "./utils/setAllIn";
import { unstable_getIn } from "./utils/getIn";
import { unstable_setIn } from "./utils/setIn";

type Messages<V> = DeepPartial<DeepMap<V, string | null | void>>;

type ValidateReturn<V> =
  | Promise<Messages<V> | null | void>
  | Messages<V>
  | null
  | void;

interface Update<V> {
  <P extends DeepPath<V, P>>(name: P, value: DeepPathValue<V, P>): void;
  <P extends DeepPath<V, P>>(
    name: P,
    value: (value: DeepPathValue<V, P>) => DeepPathValue<V, P>
  ): void;
}

export type unstable_FormState<V> = {
  /**
   * An ID that will serve as a base for the form elements.
   */
  baseId: string;
  /**
   * Form values.
   */
  values: V;
  /**
   * An object with the same shape as `form.values` with `boolean` values.
   * This keeps the touched state of each field. That is, whether a field has
   * been blurred.
   */
  touched: DeepPartial<DeepMap<V, boolean>>;
  /**
   * An object with the same shape as `form.values` with string messages.
   * This stores the messages returned by `onValidate` and `onSubmit`.
   */
  messages: Messages<V>;
  /**
   * An object with the same shape as `form.values` with string error messages.
   * This stores the error messages throwed by `onValidate` and `onSubmit`.
   */
  errors: Messages<V>;
  /**
   * Whether form is validating or not.
   */
  validating: boolean;
  /**
   * Whether `form.errors` is empty or not.
   */
  valid: boolean;
  /**
   * Whether form is submitting or not.
   */
  submitting: boolean;
  /**
   * Stores the number of times that the form has been successfully submitted.
   */
  submitSucceed: number;
  /**
   * Stores the number of times that the form submission has failed.
   */
  submitFailed: number;
};

export type unstable_FormActions<V> = {
  /**
   * Resets the form state.
   */
  reset: () => void;
  /**
   * Triggers form validation (calling `onValidate` underneath).
   * Optionally, new `values` can be passed in.
   */
  validate: (values?: V) => ValidateReturn<V>;
  /**
   * Triggers form submission (calling `onValidate` and `onSubmit` underneath).
   */
  submit: () => void;
  /**
   * Updates a form value.
   */
  update: Update<V>;
  /**
   * Sets field's touched state to `true`.
   */
  blur: <P extends DeepPath<V, P>>(name: P) => void;
  /**
   * Pushes a new item into `form.values[name]`, which should be an array.
   */
  push: <P extends DeepPath<V, P>>(
    name: P,
    value?: ArrayValue<DeepPathValue<V, P>>
  ) => void;
  /**
   * Removes `form.values[name][index]`.
   */
  remove: <P extends DeepPath<V, P>>(name: P, index: number) => void;
};

export type unstable_FormInitialState<V> = Partial<
  Pick<unstable_FormState<V>, "baseId" | "values">
> & {
  /**
   * Whether the form should trigger `onValidate` on blur.
   */
  validateOnBlur?: boolean;
  /**
   * Whether the form should trigger `onValidate` on change.
   */
  validateOnChange?: boolean;
  /**
   * Whether the form should reset when it has been successfully submitted.
   */
  resetOnSubmitSucceed?: boolean;
  /**
   * Whether the form should reset when the component (which called
   * `useFormState`) has been unmounted.
   */
  resetOnUnmount?: boolean;
  /**
   * A function that receives `form.values` and return or throw messages.
   * If it returns, messages will be interpreted as successful messages.
   * If it throws, they will be interpreted as errors.
   * It can also return a promise for asynchronous validation.
   */
  onValidate?: (values: V) => ValidateReturn<V>;
  /**
   * A function that receives `form.values` and performs form submission.
   * If it's triggered by `form.submit()`, `onValidate` will be called before.
   * If `onValidate` throws, `onSubmit` will not be called.
   * `onSubmit` can also return promises, messages and throw error messages
   * just like `onValidate`. The only difference is that this validation will
   * only occur on submit.
   */
  onSubmit?: (values: V) => ValidateReturn<V>;
};

export type unstable_FormStateReturn<V> = unstable_FormState<V> &
  unstable_FormActions<V>;

type ReducerState<V> = unstable_FormState<V> & { initialValues: V };

type ReducerAction =
  | { type: "reset" }
  | { type: "startValidate" }
  | { type: "endValidate"; errors?: any; messages?: any }
  | { type: "startSubmit" }
  | { type: "endSubmit"; errors?: any; messages?: any }
  | { type: "update"; name: any; value: any }
  | { type: "blur"; name: any }
  | { type: "push"; name: any; value: any }
  | { type: "remove"; name: any; index: number };

function getMessages<V>(
  stateMessages: Messages<V>,
  actionMessages: Messages<V>
) {
  return !isEmpty(actionMessages)
    ? actionMessages
    : isEmpty(stateMessages)
    ? stateMessages
    : {};
}

function reducer<V>(
  state: ReducerState<V>,
  action: ReducerAction
): ReducerState<V> {
  switch (action.type) {
    case "reset": {
      return {
        ...state,
        values: state.initialValues,
        touched: {},
        errors: {},
        messages: {},
        valid: true,
        validating: false,
        submitting: false,
        submitFailed: 0,
        submitSucceed: 0
      };
    }
    case "startValidate": {
      return {
        ...state,
        validating: true
      };
    }
    case "endValidate": {
      return {
        ...state,
        validating: false,
        errors: getMessages(state.errors, action.errors),
        messages: getMessages(state.messages, action.messages),
        valid: !hasMessages(action.errors)
      };
    }
    case "startSubmit": {
      return {
        ...state,
        // @ts-ignore TS bug
        touched: unstable_setAllIn(state.values, true),
        submitting: true
      };
    }
    case "endSubmit": {
      const valid = !hasMessages(action.errors);
      return {
        ...state,
        valid,
        submitting: false,
        errors: getMessages(state.errors, action.errors),
        messages: getMessages(state.messages, action.messages),
        submitSucceed: valid ? state.submitSucceed + 1 : state.submitSucceed,
        submitFailed: valid ? state.submitFailed : state.submitFailed + 1
      };
    }
    case "update": {
      const { name, value } = action;
      const nextValue =
        typeof value === "function"
          ? value(unstable_getIn(state.values, name))
          : value;
      return {
        ...state,
        values: unstable_setIn(
          state.values,
          name,
          nextValue != null ? nextValue : ""
        )
      };
    }
    case "blur": {
      return {
        ...state,
        touched: unstable_setIn(state.touched, action.name, true)
      };
    }
    case "push": {
      const array = unstable_getIn(state.values, action.name, []);
      return {
        ...state,
        values: unstable_setIn(state.values, action.name, [
          ...array,
          action.value
        ])
      };
    }
    case "remove": {
      const array = unstable_getIn(state.values, action.name, []);
      delete array[action.index];
      return {
        ...state,
        values: unstable_setIn(state.values, action.name, array)
      };
    }
    default: {
      throw new Error();
    }
  }
}

export function unstable_useFormState<V = Record<any, any>>(
  initialState: unstable_SealedInitialState<unstable_FormInitialState<V>> = {}
): unstable_FormStateReturn<V> {
  const {
    baseId = unstable_useId("form-"),
    values: initialValues = {} as V,
    validateOnBlur = true,
    validateOnChange = true,
    resetOnSubmitSucceed = false,
    resetOnUnmount = true,
    onValidate,
    onSubmit
  } = unstable_useSealedState(initialState);

  const [{ initialValues: _, ...state }, dispatch] = React.useReducer(reducer, {
    baseId,
    initialValues,
    values: initialValues,
    touched: {},
    errors: {},
    messages: {},
    valid: true,
    validating: false,
    submitting: false,
    submitFailed: 0,
    submitSucceed: 0
  });

  const validate = React.useCallback(
    async (vals = state.values) => {
      try {
        if (onValidate) {
          const response = onValidate(filterAllEmpty(vals));
          if (isPromise(response)) {
            dispatch({ type: "startValidate" });
          }
          const messages = await response;
          dispatch({ type: "endValidate", messages });
          return messages;
        }
        return undefined;
      } catch (errors) {
        dispatch({ type: "endValidate", errors });
        throw errors;
      }
    },
    [state.values, onValidate]
  );

  useUpdateEffect(() => {
    if (validateOnChange) {
      validate().catch(() => {});
    }
  }, [validate, validateOnChange]);

  React.useEffect(() => {
    if (resetOnUnmount) {
      return () => {
        dispatch({ type: "reset" });
      };
    }
    return undefined;
  }, [resetOnUnmount]);

  return {
    ...state,
    values: state.values as V,
    validate,
    reset: React.useCallback(() => dispatch({ type: "reset" }), []),
    submit: React.useCallback(async () => {
      try {
        dispatch({ type: "startSubmit" });
        const validateMessages = await validate();
        if (onSubmit) {
          const submitMessages = await onSubmit(state.values as V);
          const messages = { ...validateMessages, ...submitMessages };
          dispatch({ type: "endSubmit", messages });
          if (resetOnSubmitSucceed) {
            dispatch({ type: "reset" });
          }
        } else {
          dispatch({ type: "endSubmit", messages: validateMessages });
        }
      } catch (errors) {
        dispatch({ type: "endSubmit", errors });
      }
    }, [validate]),
    update: React.useCallback(
      (name: any, value: any) => dispatch({ type: "update", name, value }),
      []
    ),
    blur: React.useCallback(
      name => {
        dispatch({ type: "blur", name });
        if (validateOnBlur) {
          validate().catch(() => {});
        }
      },
      [validate]
    ),
    push: React.useCallback(
      (name, value) => dispatch({ type: "push", name, value }),
      []
    ),
    remove: React.useCallback(
      (name, index) => dispatch({ type: "remove", name, index }),
      []
    )
  };
}

const keys: Array<keyof unstable_FormStateReturn<any>> = [
  "baseId",
  "values",
  "touched",
  "messages",
  "errors",
  "validating",
  "valid",
  "submitting",
  "submitSucceed",
  "submitFailed",
  "validate",
  "submit",
  "reset",
  "update",
  "blur",
  "push",
  "remove"
];

unstable_useFormState.__keys = keys;
