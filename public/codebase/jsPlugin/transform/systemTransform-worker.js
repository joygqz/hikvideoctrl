importScripts('libSystemTransform.js');
const RECORDRTP = 0;  //录制一份未经过转封装的码流原始数据，用于定位问题
let dataType = 1;
    
// 字母字符串转byte数组
function stringToBytes (str) {
  var ch;
  var st;
  var re = [];
  for (var i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i);  // get char
    st = [];                 // set up "stack"
    do {
      st.push(ch & 0xFF);    // push byte to stack
      ch = ch >> 8;          // shift value down by 1 byte
    }
    while (ch);
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat(st.reverse());
  }
  // return an array of bytes
  return re;
}

// 转封装库回调函数
self.STCallBack = function (fileIndex, indexLen, data, dataLen) {
  //stFrameInfo的类型见DETAIL_FRAME_INFO
  let stFrameInfo = Module._GetDetialFrameInfo();
  let nIsMp4Index = stFrameInfo.nIsMp4Index;
		
  //console.log("FrameType is " , stFrameInfo);
  //console.log("nIsMp4Index is " + nIsMp4Index);
  //debugger
  var pData = null;
  pData = new Uint8Array(dataLen);
  pData.set(Module.HEAPU8.subarray(data, data + dataLen));
  if (dataType === 1) {
    postMessage({ type: "outputData",
      buf: pData.buffer,
      dType: 1,
      frameInfo: stFrameInfo }, [pData.buffer]);
    dataType = 2;
  } else {
    if (nIsMp4Index) {
      postMessage({ type: "outputData",
        buf: pData.buffer,
        dType: 6,
        frameInfo: stFrameInfo }, [pData.buffer]); //6：索引类型
    } else {
      postMessage({ type: "outputData",
        buf: pData.buffer,
        dType: 2,
        frameInfo: stFrameInfo }, [pData.buffer]); //2:码流
    }
  }

  //stFrameInfo的类型见DETAIL_FRAME_INFO
  //let stFrameInfo = Module._GetDetialFrameInfo();
  //let stFrameType = stFrameInfo.nFrameType;
  //let nFrameNum = stFrameInfo.nFrameNum;
  //let nTimeStamp = stFrameInfo.nTimeStamp;
  //let nIsMp4Index = stFrameInfo.nIsMp4Index;
		
  //console.log("FrameType is " + stFrameType);
  //console.log("nIsMp4Index is " + nIsMp4Index);
};

// self.Module = { memoryInitializerRequest: loadMemInitFile(), TOTAL_MEMORY: 128*1024*1024 };
// importScripts('SystemTransform.js');

self.Module['onRuntimeInitialized'] = function () {
  postMessage({type: "loaded"});
};
onmessage = function (e) {
  var data = e.data;
  if ("create" === data.type) {
    if (RECORDRTP) {
      postMessage({ type: "created" });
      postMessage({ type: "outputData",
        buf: data.buf,
        dType: 1 }, [data.buf]);
    } else {
      var iHeadLen = data.len;
      var pHead = Module._malloc(iHeadLen);
      if (pHead === null) {
        console.log("inputdata malloc failed!!!");
        return -1;
      }
      var iTransType = data.packType;//目标格式
      var iRet = 0;
      var buf = new Uint8Array(data.buf);
      //PS流(只有ps支持探测)，并且编码格式异常（正常是265和264，11位和10位 不可能全是0，全0 并且是ps就探测策略）的情况下，使用探测策略
      if (buf[9] === 0 && buf[8] === 2 && buf[11] === 0 && buf[10] === 0) {
        iRet = Module._CreatHandle(0, iTransType, iHeadLen); //用探测的策略
      } else {
        self.writeArrayToMemory(buf, pHead);
        iRet = Module._CreatHandle(pHead, iTransType, iHeadLen);
        //-2147483645代表的是参数错误，此种情况，大概率发生在头信息错误，例如大华设备的情况，此时用 无头探测的策略
        //其他情况 按海康标准处理流程，不要做任何特殊处理
        if (iRet == -2147483645) {
          iRet = Module._CreatHandle(0, iTransType, iHeadLen); //失败了，用探测的策略再试一次
        }
      }
      if (iRet != 0) {
        if (iRet == -2147483647) {
          postMessage({ type: "outputData",
            dType: 1501 }); //标记为格式不支持
        } else {
          postMessage({ type: "outputData",
            dType: 1501 }); //转封装创建失败，也同样提示码流格式不支持，如果后续要细化再区分
        }
        console.log("_CreatHandle failed!" + iRet);
      } else {
        if (data.options && typeof data.options.pKeyData !== "undefined" && data.options.pKeyData !== null) {
          if ((2 === iTransType && "" === data.options.pKeyData)) {
            //转ps的时候，如果密码是空是允许的，即使码流加密了，导出加密后的码流就行
            //此时不要设置密码否则反而会提示密码错误
          } else {
            var secretInfo = data.options;
            var keyLen = secretInfo.nKeyLen;
            var pKeyData = Module._malloc(keyLen);
            if (pKeyData === null) {
              console.log("setEncryptKey malloc failed!!!");
              return -1;
            }
            var nKeySize = secretInfo.pKeyData.length;
            var bufData = stringToBytes(secretInfo.pKeyData);
                  
            let inputData = new Uint8Array(bufData);
            Module.writeArrayToMemory(inputData, pKeyData);
            inputData = null;
                      
            iRet = Module._SysTransSetEncryptKey(secretInfo.nKeyType, pKeyData, keyLen, nKeySize);
            if (iRet != 0) {
              console.log("_SysTransSetEncryptKey failed!");
            }
            if (pKeyData != null) {
              Module._free(pKeyData);
              pKeyData = null;
            }
          }
        }
        //带samplingParam参数，代表需要 用到 音频替换功能
        if (data.options && typeof data.options.samplingParam !== "undefined") {
          var oParam = data.options.samplingParam;
          var nCapacityType = 1;                                //写死1 代表 剔除音频
          var nType = 3;                                        //写死3 代表 修改输出目标的海康头配置，内部包含视频参数、音频参数
          var nAudioEnable = 1;                                 //音频参数修改使能开关，0=不启用，1=启用
          var nAudioFormat = oParam.iAudioType;                 //音频编码类型 对应关系参考海康媒体头规范，PCM 0x7001  G711_U 0x7110  G711_A 0x7111 AAC 0x2001
          var nAudioChannels = oParam.iChannel;                 //音频通道数直接设置为
          var nAudioBitsPerSample = oParam.iAudioBitWidth;      //音频位样率
          var nAudioSamplesrate = oParam.iAudioSamplingRate;    //音频采样率
          var nAudioBitrate = oParam.iAudioBitRate;             //音频比特率
          iRet = Module._SysTransConfig(nCapacityType, nType, nAudioEnable, nAudioFormat,
            nAudioChannels, nAudioBitsPerSample, nAudioSamplesrate, nAudioBitrate);
          if (iRet != 0) {
            console.log("_SysTransConfig Failed:" + iRet);
          }
        } else {
          iRet = Module._SysTransConfig(128, 0, 0, 0, 0, 0, 0, 0);  //nCapacityType = 0x00000080 代表开启私有信息回调 解决转mp4后，私有信息丢失问题
          if (iRet != 0) {
            console.log("_SysTransConfig Failed:" + iRet);
          }
        }
        iRet = Module._SysTransRegisterDataCallBack();
        if (iRet != 0) {
          console.log("_SysTransRegisterDataCallBack Failed:" + iRet);
        }

        iRet = Module._SysTransStart(null, null);
        if (iRet != 0) {
          console.log("_SysTransStart Failed:" + iRet);
        }
        postMessage({type: "created"});
      }
      if (pHead != null) {
        Module._free(pHead);
        pHead = null;
      }
    }
  } else if ("inputData" === data.type) {
    if (RECORDRTP) {
      var aFileData = new Uint8Array(data.buf);  // 拷贝一份
      var iBufferLen = aFileData.length;
      var szBufferLen = iBufferLen.toString(16);
      if (szBufferLen.length === 1) {
        szBufferLen = "000" + szBufferLen;
      } else if (szBufferLen.length === 2) {
        szBufferLen = "00" + szBufferLen;
      } else if (szBufferLen.length === 3) {
        szBufferLen = "0" + szBufferLen;
      }
      var aData = [0, 0, parseInt(szBufferLen.substring(0, 2), 16), parseInt(szBufferLen.substring(2, 4), 16)];
      for (var iIndex = 0, iDataLength = aFileData.length; iIndex < iDataLength; iIndex++) {
        aData[iIndex + 4] = aFileData[iIndex];
      }
      var dataUint8 = new Uint8Array(aData);
      postMessage({type: "outputData",
        buf: dataUint8.buffer,
        dType: 2});
    } else {
      let inputMode = 0; //代表输入原始数据
      if (data.samplingParam) {
        iRet = Module._SysTransInputAudioPara(5, data.samplingParam.iChannel, data.samplingParam.iAudioBitWidth,
          data.samplingParam.iAudioSamplingRate, data.samplingParam.iTimeStamp, data.samplingParam.iAudioBitRate);            //参数含义和_SysTransConfig类似
        if (iRet != 0) {
          console.log("_SysTransInputAudioPara Failed:" + iRet);
        }
        inputMode = 2; //输入替换的音频
      }
      var pInputDataBuf = Module._malloc(data.len);
      var idataLen = data.len;
      self.writeArrayToMemory(new Uint8Array(data.buf), pInputDataBuf);
      // 输入数据，每次最多2m
      let pp = Module._SysTransInputData(inputMode, pInputDataBuf, idataLen);
      if (pp == -2147483627) {
        //-2147483627 对应十六进制的80000015
        postMessage({ type: "outputData",
          dType: 1500 }); //标记为密码错误
      } else if (pp == -2147483647) {
        postMessage({ type: "outputData",
          dType: 1501 }); //标记为格式不支持
      } else if (pp != 0) {
        console.log("InputData Failed:" + pp);
      }
      Module._free(pInputDataBuf);
    }
  } else if ("release" === data.type) {
    var iRet = Module._SysTransStop();
    if (iRet != 0) {
      console.log("_SysTransStop failed!");
    }
    Module._SysTransRelease();
    if (iRet != 0) {
      console.log("_SysTransRelease failed!");
    }
    close();
  }
};