class AudioStreamProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            // Get the first channel of the input
            const channel = input[0];
            // Send the raw Float32 data to the main thread
            this.port.postMessage(channel);
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioStreamProcessor);
