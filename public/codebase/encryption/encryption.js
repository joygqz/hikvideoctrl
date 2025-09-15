define(function(require, exports, module) {
	var _oCommon, _oUtils, _oBase64;

	require("websdk");
	_oCommon = require("common");
	_oUtils = require("utils");
	_oBase64 = require("base64");

	function EncryptionFac () {}

	EncryptionFac.prototype.encrypt = function (oStr, iRSABits, bBase64Encrypted, cbFun) {
		//var that = this;
		var	iBits = 1024;

		if (iRSABits) {
			iBits = iRSABits;
		}

		var szPassPhrase =  new Date() + "",
			szMattsRSAkey = cryptico.generateRSAKey(szPassPhrase, iBits),
			szPublicKeyString = cryptico.publicKeyString(szMattsRSAkey),
			szXml = "<?xml version='1.0' encoding='UTF-8'?><PublicKey><key>" + _oBase64.encode(szPublicKeyString) + "</key></PublicKey>",
			oXmlDoc = _oUtils.parseXmlFromStr(szXml);

		WebSDK.WSDK_Request(_oCommon.m_szHostName, _oCommon.m_iHttpProtocal, _oCommon.m_iHttpPort, {
			cmd: "challenge",
			type: "POST",
			data: oXmlDoc,
			success: function (status, xmlDoc) {
				var szDecryptionResult = cryptico.decrypt(_oBase64.decode(_oUtils.nodeValue(xmlDoc, "key")), szMattsRSAkey);
				if(szDecryptionResult.plaintext != null) {
					var szKey,szEncryptPassword;
					var aResult = [];
					if (iBits === 256) {
						szKey = _oUtils.toHex(szDecryptionResult.plaintext);
					} else {
						szKey = szDecryptionResult.plaintext;
					}

					szEncryptPassword = aes_encrypt(szDecryptionResult.plaintext.substring(0, 16), szKey, true);

					if("function" === typeof cbFun) {
						if("string" === typeof oStr) {
							bBase64Encrypted && ( oStr = _oBase64.encode(oStr) );
							cbFun( _oBase64.encode( szEncryptPassword + _oUtils.encodeAES(oStr, szKey, "", "ecb") ) );
						} else if("[object Array]" === Object.prototype.toString.call(oStr)) {
							for(var i = 0, iArrayLen = oStr.length; i < iArrayLen; i++) {
								bBase64Encrypted && ( oStr[i] = _oBase64.encode(oStr[i]) );
								var szTemp = szEncryptPassword + _oUtils.encodeAES(oStr[i], szKey, "", "ecb");
								aResult.push( _oBase64.encode(szTemp) );
							}
							cbFun(aResult);
						}
					}
				}
			}
		});
	};

	EncryptionFac.prototype.encryptSync = function (oStr, iRSABits, bBase64Encrypted) {
		//var that = this;
		var	iBits = 1024;
		var aResult = [];

		if (iRSABits) {
			iBits = iRSABits;
		}

		var szPassPhrase =  new Date() + "",
			szMattsRSAkey = cryptico.generateRSAKey(szPassPhrase, iBits),
			szPublicKeyString = cryptico.publicKeyString(szMattsRSAkey),
			szXml = "<?xml version='1.0' encoding='UTF-8'?><PublicKey><key>" + _oBase64.encode(szPublicKeyString) + "</key></PublicKey>",
			oXmlDoc = _oUtils.parseXmlFromStr(szXml);

		WebSDK.WSDK_Request(_oCommon.m_szHostName, _oCommon.m_iHttpProtocal, _oCommon.m_iHttpPort, {
			cmd: "challenge",
			type: "POST",
			async: false,
			data: oXmlDoc,
			success: function (status, xmlDoc) {
				var szDecryptionResult = cryptico.decrypt(_oBase64.decode(_oUtils.nodeValue(xmlDoc, "key")), szMattsRSAkey);
				if(szDecryptionResult.plaintext != null) {
					var szKey, szEncryptPassword;
					if (iBits === 256) {
						szKey = _oUtils.toHex(szDecryptionResult.plaintext);
					} else {
						szKey = szDecryptionResult.plaintext;
					}
					szEncryptPassword = aes_encrypt(szDecryptionResult.plaintext.substring(0, 16), szKey, true);
					if("string" === typeof oStr) {
						bBase64Encrypted && ( oStr = _oBase64.encode(oStr) );
						aResult.push( _oBase64.encode( szEncryptPassword + _oUtils.encodeAES(oStr, szKey, "", "ecb") ) );
					} else {
						for(var i = 0, iArrayLen = oStr.length; i < iArrayLen; i++) {
							bBase64Encrypted && ( oStr[i] = _oBase64.encode(oStr[i]) );
							var szTemp = szEncryptPassword + _oUtils.encodeAES(oStr[i], szKey, "", "ecb");
							aResult.push( _oBase64.encode(szTemp) );
						}
					}
				}
			}
		});
		if("string" === typeof oStr) {
			return aResult[0];
		} else {
			return aResult;
		}
	};

	module.exports = new EncryptionFac();
});