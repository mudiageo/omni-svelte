try {
    throw new AggregateError([new Error("inner")], "Agg");
} catch (err) {
    const stackDesc = Object.getOwnPropertyDescriptor(err, 'stack');
    console.log("Descriptor:", stackDesc);
}
