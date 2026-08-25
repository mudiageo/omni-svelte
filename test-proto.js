class CustomError extends Error {
    get stack() { return "custom stack"; }
}
const err = new CustomError("test");
console.log("Descriptor on instance:", Object.getOwnPropertyDescriptor(err, 'stack'));
try {
    err.stack = "new stack";
} catch (e) {
    console.error("Assign Error:", e.message);
}
