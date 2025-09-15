importScripts('AudioAMER.js');

let channelNum = 2;           // 通道数（需求上只需要2通道，不用改）
let sampleRate = 32000;       // 采样率，支持8K/16K/32K/48K
let bitsPerSample = 16;       // 采样精度，支持16/32
let dataLen = 320;            // 一帧数据长度（采样点数），320个16位采样点即640B，支持4/8/10/16/20/24/30/32/40ms

// self.JSAudioCodecModule['onRuntimeInitialized'] = function () {
//   JSAudioCodecModule().then(instance => {
//     AudioModule = instance;
//   });
//   postMessage({type: "loaded"});
// };

JSAudioCodecModule().then(instance => {
  AudioModule = instance;
  postMessage({type: "loaded"});
});

onmessage = function (e) {
  let data = e.data;
  if ("create" === data.type) {
    let size = AudioModule._malloc(4);
    let alignment = AudioModule._malloc(4);
    if (size === null || alignment === null) {
      console.log("inputdata malloc failed!!!");
      return -1;
    }
    channelNum = data.channelNum;
    sampleRate = data.sampleRate;
    bitsPerSample = data.bitsPerSample;
    dataLen = data.dataLen;

    let iRet = AudioModule._JSHIK_AMER_GetMemSize(channelNum, sampleRate, bitsPerSample, dataLen, size, alignment);
    if (iRet !== 1) {
      console.log("_CreatHandle failed!" + iRet);
    } else {
      let sizeOut = AudioModule.getValue(size, "i32");
      let alignmentOut = AudioModule.getValue(alignment, "i32");
      iRet = AudioModule._JSHIK_AMER_Create(channelNum, sampleRate, bitsPerSample, dataLen, sizeOut, alignmentOut);
      console.log("Create_res:" + iRet);
      postMessage({type: "created"});
    }
    if (size !== null) {
      AudioModule._free(size);
      size = null;
    }
    if (alignment !== null) {
      AudioModule._free(alignment);
      alignment = null;
    }
  } else if ("inputData" === data.type) {
    let inputSize = dataLen * 2;//dataLen为320，inputSize应该是 320 * 2 = 640
    let pInputData1 = AudioModule._malloc(inputSize);
    let pInputData2 = AudioModule._malloc(inputSize);
    
    let pOutputData1 = AudioModule._malloc(inputSize);
    let pOutputData2 = AudioModule._malloc(inputSize);
    let pOutputData3 = AudioModule._malloc(inputSize);
    if (pInputData1 === null || pInputData2 === null || pOutputData1 === null || pOutputData2 === null || pOutputData3 === null) {
      console.log("inputdata or outputData malloc failed!!!");
      return -1;
    }
    let inputData1 = new Uint8Array(data.buf1);
    let inputData2 = new Uint8Array(data.buf2);
    AudioModule.writeArrayToMemory(inputData1, pInputData1);
    AudioModule.writeArrayToMemory(inputData2, pInputData2);
    inputData1 = null;
    inputData2 = null;
    // 开始处理
    let res = AudioModule._JSHIK_AMER_Process(pInputData1, pInputData2, pOutputData1, pOutputData2, pOutputData3, parseInt(inputSize / 2, 10));
    if (res === 1) {
      let aOutputData = new Uint8Array(inputSize);
      aOutputData.set(AudioModule.HEAPU8.subarray(pOutputData3, pOutputData3 + inputSize));	 // 必须取pOutputData3的数据
      // postMessage({ type: "outputData", buf: aOutputData}, [aOutputData]);
      postMessage({ type: "outputData", dType: 1, buf: aOutputData.buffer}, [aOutputData.buffer]);
    }
    AudioModule._free(pInputData1);
    AudioModule._free(pInputData2);
    AudioModule._free(pOutputData1);
    AudioModule._free(pOutputData2);
    AudioModule._free(pOutputData3);
  } else if ("release" === data.type) {
    //奇怪，到时和研究院确认一下，库为什么不提供释放资源或者停止的接口？？
    close();
  }
};