export const calculatePrice = (cost: number, markup: number) => {
  return cost * (1 + markup / 100);
};
export default { calculatePrice };
