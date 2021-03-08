// utility function to simulate an asynchronous operation
export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
