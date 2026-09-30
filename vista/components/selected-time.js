const dateFormat = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function mount(element, selectedData) {
  const date = element.querySelector(".selected-time__date");
  const time = element.querySelector(".selected-time__time");

  function update(data) {
    date.textContent = data ? dateFormat.format(data.timestamp) : "";
    time.textContent = data ? timeFormat.format(data.timestamp) : "";
  }

  update(selectedData);
  return { update };
}
