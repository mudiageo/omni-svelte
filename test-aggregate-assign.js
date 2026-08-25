try {
    throw new AggregateError([new Error("inner")], "Agg");
} catch (err) {
    err.stack = "new stack";
    console.log("Assigned successfully:", err.stack);
}
