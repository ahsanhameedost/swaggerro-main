import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export const SERVER_DATE_FORMAT = "YYYY-MM-DD";
export const USER_DATE_FORMAT = "MM-DD-YYYY";
export const USER_HUM_DATE_FORMAT = "MM/DD/YYYY";
export const USER_TIME_FORMAT = "hh:mm A";
export const SERVER_TIME_FORMAT = "HH:mm";

export const formatServerDate = (date:string) => {
  return dayjs(date, SERVER_DATE_FORMAT).format(USER_HUM_DATE_FORMAT);
};

export const formatServerTime = (time:string) => {
  dayjs.extend(customParseFormat);

  return dayjs(time, "HH:mm").format(USER_TIME_FORMAT);
};

export const formatServerDateTime = (dateTime:string) => {
  return dayjs(dateTime, SERVER_DATE_FORMAT + " " + SERVER_TIME_FORMAT).format(
    USER_HUM_DATE_FORMAT + " " + USER_TIME_FORMAT,
  );
};