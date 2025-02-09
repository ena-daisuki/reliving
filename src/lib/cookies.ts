import {
  setCookie as setNextCookie,
  getCookie as getNextCookie,
} from "cookies-next";

export function setCookie(key: string, value: string) {
  setNextCookie(key, value, { maxAge: 60 * 60 * 24 * 7 }); // 7 days
}

export function getCookie(key: string) {
  return getNextCookie(key);
}
