import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { colors, globalStyles } from "../theme";
import { DropdownSelect as InternalDropdownSelect } from "./DropdownSelect";

export interface RecurrenceState {
  isRecurring: boolean;
  recurrence_type: "weekly" | "monthly" | "yearly";
  recurrence_basis: string;
  month_to_recur: string;
  week_to_recur: string;
  day_to_recur: string;
  monthly_type: "calendar" | "nth";
  yearly_type: "calendar" | "nth";
}

export const defaultRecurrenceState: RecurrenceState = {
  isRecurring: false,
  recurrence_type: "monthly",
  recurrence_basis: "1",
  month_to_recur: "0",
  week_to_recur: "0",
  day_to_recur: "1",
  monthly_type: "calendar",
  yearly_type: "calendar",
};

interface RecurrencePickerProps {
  state: RecurrenceState;
  onChange: (newState: RecurrenceState) => void;
}

const DropdownSelect = ({ value, options, onSelect }: any) => {
  return (
    <InternalDropdownSelect value={value} onSelect={onSelect} options={options} />
  );
};

const NumberInput = ({ value, onChange, min, max }: any) => {
  const options = Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => ({ label: n.toString(), value: n.toString() }));
  return (
    <InternalDropdownSelect value={value} onSelect={onChange} options={options} />
  );
};

const DAYS_OF_WEEK = [
  { label: "Sunday", value: "0" },
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
];

const WEEKS = [
  { label: "1st", value: "1" },
  { label: "2nd", value: "2" },
  { label: "3rd", value: "3" },
  { label: "4th", value: "4" },
  { label: "Last", value: "5" },
];

const MONTHS = [
  { label: "January", value: "0" },
  { label: "February", value: "1" },
  { label: "March", value: "2" },
  { label: "April", value: "3" },
  { label: "May", value: "4" },
  { label: "June", value: "5" },
  { label: "July", value: "6" },
  { label: "August", value: "7" },
  { label: "September", value: "8" },
  { label: "October", value: "9" },
  { label: "November", value: "10" },
  { label: "December", value: "11" },
];

export const RecurrencePicker: React.FC<RecurrencePickerProps> = ({ state, onChange }) => {
  const update = (key: keyof RecurrenceState, value: any) => {
    onChange({ ...state, [key]: value });
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={styles.label}>Recurring event?</Text>
        <Switch value={state.isRecurring} onValueChange={(val) => update("isRecurring", val)} />
      </View>

      {state.isRecurring && (
        <View style={styles.content}>
          <View style={[styles.row, { zIndex: 100, elevation: 100 }]}>
            <Text style={styles.text}>Every</Text>
            <View style={{ width: 80, marginHorizontal: 8 }}>
              <NumberInput value={state.recurrence_basis} onChange={(v: string) => update("recurrence_basis", v)} min={1} max={99} />
            </View>
            <View style={{ flex: 1, zIndex: 50, elevation: 50 }}>
              <DropdownSelect
                value={state.recurrence_type}
                onSelect={(v: string) => {
                  let nextState = { ...state, recurrence_type: v as any };
                  if (v === "weekly") nextState.day_to_recur = "0";
                  if (v === "monthly") {
                    nextState.monthly_type = "calendar";
                    nextState.day_to_recur = "1";
                  }
                  if (v === "yearly") {
                    nextState.yearly_type = "calendar";
                    nextState.day_to_recur = "1";
                  }
                  onChange(nextState);
                }}
                options={[
                  { label: "Weeks", value: "weekly" },
                  { label: "Months", value: "monthly" },
                  { label: "Years", value: "yearly" },
                ]}
              />
            </View>
          </View>

          {state.recurrence_type === "weekly" && (
            <View style={[styles.row, { zIndex: 90, elevation: 90 }]}>
              <Text style={styles.text}>On</Text>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <DropdownSelect value={state.day_to_recur} onSelect={(v: string) => update("day_to_recur", v)} options={DAYS_OF_WEEK} />
              </View>
            </View>
          )}

          {state.recurrence_type === "monthly" && (
            <View style={[styles.col, { zIndex: 80, elevation: 80 }]}>
              <View style={[styles.row, { marginBottom: 8, zIndex: 70, elevation: 70 }]}>
                <TouchableOpacity onPress={() => update("monthly_type", "calendar")} style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                  <View style={[styles.radio, state.monthly_type === "calendar" && styles.radioActive]} />
                  <Text style={styles.text}>On day</Text>
                </TouchableOpacity>
                {state.monthly_type === "calendar" && (
                  <View style={{ width: 80 }}>
                    <NumberInput value={state.day_to_recur} onChange={(v: string) => update("day_to_recur", v)} min={1} max={31} />
                  </View>
                )}
              </View>
              <View style={[styles.row, { zIndex: 60, elevation: 60 }]}>
                <TouchableOpacity onPress={() => update("monthly_type", "nth")} style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                  <View style={[styles.radio, state.monthly_type === "nth" && styles.radioActive]} />
                  <Text style={styles.text}>On the</Text>
                </TouchableOpacity>
                {state.monthly_type === "nth" && (
                  <>
                    <View style={{ width: 100, marginRight: 8, zIndex: 100, elevation: 100 }}>
                      <DropdownSelect value={state.week_to_recur} onSelect={(v: string) => update("week_to_recur", v)} options={WEEKS} />
                    </View>
                    <View style={{ flex: 1, zIndex: 50, elevation: 50 }}>
                      <DropdownSelect value={state.day_to_recur} onSelect={(v: string) => update("day_to_recur", v)} options={DAYS_OF_WEEK} />
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {state.recurrence_type === "yearly" && (
            <View style={[styles.col, { zIndex: 50, elevation: 50 }]}>
              <View style={[styles.row, { marginBottom: 8, zIndex: 40, elevation: 40 }]}>
                <Text style={styles.text}>In</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <DropdownSelect value={state.month_to_recur} onSelect={(v: string) => update("month_to_recur", v)} options={MONTHS} />
                </View>
              </View>

              <View style={[styles.row, { marginBottom: 8, zIndex: 30, elevation: 30 }]}>
                <TouchableOpacity onPress={() => update("yearly_type", "calendar")} style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                  <View style={[styles.radio, state.yearly_type === "calendar" && styles.radioActive]} />
                  <Text style={styles.text}>On day</Text>
                </TouchableOpacity>
                {state.yearly_type === "calendar" && (
                  <View style={{ width: 80 }}>
                    <NumberInput value={state.day_to_recur} onChange={(v: string) => update("day_to_recur", v)} min={1} max={31} />
                  </View>
                )}
              </View>
              <View style={[styles.row, { zIndex: 20, elevation: 20 }]}>
                <TouchableOpacity onPress={() => update("yearly_type", "nth")} style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                  <View style={[styles.radio, state.yearly_type === "nth" && styles.radioActive]} />
                  <Text style={styles.text}>On the</Text>
                </TouchableOpacity>
                {state.yearly_type === "nth" && (
                  <>
                    <View style={{ width: 100, marginRight: 8, zIndex: 100, elevation: 100 }}>
                      <DropdownSelect value={state.week_to_recur} onSelect={(v: string) => update("week_to_recur", v)} options={WEEKS} />
                    </View>
                    <View style={{ flex: 1, zIndex: 50, elevation: 50 }}>
                      <DropdownSelect value={state.day_to_recur} onSelect={(v: string) => update("day_to_recur", v)} options={DAYS_OF_WEEK} />
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export const parseMeetupToRecurrenceState = (meetup: any): RecurrenceState => {
  if (!meetup.recurrence_type) {
    return defaultRecurrenceState;
  }
  const isCalendar = !meetup.week_to_recur || meetup.week_to_recur === 0;
  return {
    isRecurring: true,
    recurrence_type: meetup.recurrence_type as any,
    recurrence_basis: (meetup.recurrence_basis || 1).toString(),
    month_to_recur: (meetup.month_to_recur || 0).toString(),
    week_to_recur: (meetup.week_to_recur || 1).toString(),
    day_to_recur: (meetup.day_to_recur || 0).toString(),
    monthly_type: isCalendar ? "calendar" : "nth",
    yearly_type: isCalendar ? "calendar" : "nth",
  };
};

export const buildRecurrencePayload = (state: RecurrenceState) => {
  if (!state.isRecurring) {
    return {
      recurrence_type: undefined,
      recurrence_basis: undefined,
      month_to_recur: undefined,
      week_to_recur: undefined,
      day_to_recur: undefined,
    };
  }

  const basis = parseInt(state.recurrence_basis) || 1;
  if (state.recurrence_type === "weekly") {
    return {
      recurrence_type: "weekly",
      recurrence_basis: basis,
      month_to_recur: undefined,
      week_to_recur: undefined,
      day_to_recur: parseInt(state.day_to_recur) || 0,
    };
  }

  if (state.recurrence_type === "monthly") {
    if (state.monthly_type === "calendar") {
      return {
        recurrence_type: "monthly",
        recurrence_basis: basis,
        month_to_recur: undefined,
        week_to_recur: 0,
        day_to_recur: parseInt(state.day_to_recur) || 1,
      };
    } else {
      return {
        recurrence_type: "monthly",
        recurrence_basis: basis,
        month_to_recur: undefined,
        week_to_recur: parseInt(state.week_to_recur) || 1,
        day_to_recur: parseInt(state.day_to_recur) || 0,
      };
    }
  }

  if (state.recurrence_type === "yearly") {
    if (state.yearly_type === "calendar") {
      return {
        recurrence_type: "yearly",
        recurrence_basis: basis,
        month_to_recur: parseInt(state.month_to_recur) || 0,
        week_to_recur: 0,
        day_to_recur: parseInt(state.day_to_recur) || 1,
      };
    } else {
      return {
        recurrence_type: "yearly",
        recurrence_basis: basis,
        month_to_recur: parseInt(state.month_to_recur) || 0,
        week_to_recur: parseInt(state.week_to_recur) || 1,
        day_to_recur: parseInt(state.day_to_recur) || 0,
      };
    }
  }

  return {};
};

export const getRecurrenceString = (meetup: any): string | null => {
  if (!meetup.recurrence_type) return null;
  const basis = meetup.recurrence_basis || 1;
  const type = meetup.recurrence_type;

  let str = `Repeats every ${basis === 1 ? '' : basis + ' '}${type === 'weekly' ? 'week' : type === 'monthly' ? 'month' : 'year'}${basis > 1 ? 's' : ''}`;

  if (type === 'weekly') {
    str += ` on ${DAYS_OF_WEEK.find(d => d.value === String(meetup.day_to_recur))?.label}`;
  } else if (type === 'monthly') {
    if (!meetup.week_to_recur || meetup.week_to_recur === 0) {
      str += ` on the ${meetup.day_to_recur}${getSuffix(meetup.day_to_recur)}`;
    } else {
      str += ` on the ${WEEKS.find(w => w.value === String(meetup.week_to_recur))?.label} ${DAYS_OF_WEEK.find(d => d.value === String(meetup.day_to_recur))?.label}`;
    }
  } else if (type === 'yearly') {
    const month = MONTHS.find(m => m.value === String(meetup.month_to_recur))?.label;
    if (!meetup.week_to_recur || meetup.week_to_recur === 0) {
      str += ` on ${month} ${meetup.day_to_recur}${getSuffix(meetup.day_to_recur)}`;
    } else {
      str += ` on the ${WEEKS.find(w => w.value === String(meetup.week_to_recur))?.label} ${DAYS_OF_WEEK.find(d => d.value === String(meetup.day_to_recur))?.label} of ${month}`;
    }
  }
  return str.replace(' every week', ' every week').replace(' every month', ' every month').replace(' every year', ' every year'); // formatting cleanup
};

const getSuffix = (i: number) => {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  content: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
  },
  label: globalStyles.label,
  text: {
    color: colors.text,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  col: {
    flexDirection: "column",
  },
  pickerContainer: {
    backgroundColor: colors.glassBackground,
    borderRadius: 12,
    overflow: "hidden",
    height: 44,
    justifyContent: "center",
  },
  picker: {
    backgroundColor: colors.glassBackground,
    color: colors.text,
    borderRadius: 12,
    padding: 10,
    borderWidth: 0,
    // outlineStyle: "none",
    height: 44,
    fontSize: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 8,
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  }
});
