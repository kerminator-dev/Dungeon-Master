'use strict';
// Fixed 20 ms blocks are captured on the audio render thread, independently of game frames.
class VoiceCapture extends AudioWorkletProcessor {
  constructor(){super();this.samples=new Float32Array(Math.round(sampleRate*.02));this.offset=0;this.live=true;this.port.onmessage=e=>{if(e.data==='stop')this.live=false}}
  process(inputs){if(!this.live)return false;const input=inputs[0]?.[0];if(!input)return true;
    for(let i=0;i<input.length;i++){if(this.offset===0)this.time=currentTime+i/sampleRate;this.samples[this.offset++]=input[i];
      if(this.offset===this.samples.length){this.port.postMessage({samples:this.samples,time:this.time},[this.samples.buffer]);this.samples=new Float32Array(Math.round(sampleRate*.02));this.offset=0}}
    return true;
  }
}
registerProcessor('voice-capture',VoiceCapture);
