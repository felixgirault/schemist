let id = 0;

export const uid = () => id++;

export const range = (count: number) => [...Array(count).keys()];
