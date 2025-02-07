export function getMinutes(time: number) {
  return Math.floor(time / 60) < 10
    ? `0${Math.floor(time / 60)}`
    : Math.floor(time / 60);
}

export function getSeconds(time: number) {
  return time % 60 < 10 ? `0${time % 60}` : time % 60;
}
