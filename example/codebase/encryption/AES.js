(function() {
	var Nr = 10;
	// convert two-dimensional indicies to one-dim array indices
	var I00 = 0;
	var I01 = 1;
	var I02 = 2;
	var I03 = 3;
	var I10 = 4;
	var I11 = 5;
	var I12 = 6;
	var I13 = 7;
	var I20 = 8;
	var I21 = 9;
	var I22 = 10;
	var I23 = 11;
	var I30 = 12;
	var I31 = 13;
	var I32 = 14;
	var I33 = 15;
	
	// S-Box substitution table
	var S_enc = new Array(
	0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5,
	0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
	0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
	0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
	0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc,
	0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
	0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a,
	0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
	0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
	0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
	0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b,
	0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
	0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
	0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
	0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
	0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
	0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17,
	0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
	0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88,
	0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
	0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
	0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
	0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9,
	0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
	0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6,
	0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
	0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
	0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
	0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94,
	0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
	0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68,
	0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16);
	
	// inverse S-Box for decryptions
	var S_dec = new Array(
	0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38,
	0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
	0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87,
	0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
	0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d,
	0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
	0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2,
	0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
	0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16,
	0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
	0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda,
	0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
	0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a,
	0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
	0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02,
	0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
	0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea,
	0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
	0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85,
	0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
	0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89,
	0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
	0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20,
	0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
	0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31,
	0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
	0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d,
	0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
	0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0,
	0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
	0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26,
	0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d);
	
	function cvt_hex8 (val) {
		var vh = (val>>>4)&0x0f;
		return vh.toString(16) + (val&0x0f).toString(16);
	}
	function cvt_byte (str) {
		// get the first hex digit
		var val1 = str.charCodeAt(0);
		// do some error checking
		if (val1 >= 48 && val1 <= 57) {
			// have a valid digit 0-9
			val1 -= 48;
		} else if (val1 >= 65 && val1 <= 70) {
			// have a valid digit A-F
			val1 -= 55;
		} else if (val1 >= 97 && val1 <= 102) {
			// have a valid digit A-F
			val1 -= 87;
		} else {
			// not 0-9 or A-F, complain
			console.log( str.charAt(1)+" is not a valid hex digit" );
			return -1;
		}
		// get the second hex digit
		var val2 = str.charCodeAt(1);
		// do some error checking
		if ( val2 >= 48 && val2 <= 57 ) {
			// have a valid digit 0-9
			val2 -= 48;
		} else if ( val2 >= 65 && val2 <= 70 ) {
			// have a valid digit A-F
			val2 -= 55;
		} else if ( val2 >= 97 && val2 <= 102 ) {
			// have a valid digit A-F
			val2 -= 87;
		} else {
			// not 0-9 or A-F, complain
			console.log( str.charAt(2)+" is not a valid hex digit" );
			return -1;
		}
		// all is ok, return the value
		return val1*16 + val2;
	}
	
	// conversion function for non-constant subscripts
	// assume subscript range 0..3
	function I(x,y) {
		return (x*4) + y;
	}
	
	// remove spaces from input
	function remove_spaces(instr) {
		var i;
		var outstr = "";
		for(i=0; i<instr.length; i++) {
		if ( instr.charAt(i) != " " )
			 // not a space, include it
			 outstr += instr.charAt(i);
		}
		return outstr;
	}

	// get the message to encrypt/decrypt or the key
	// return as a 16-byte array
	function get_value(str, isASCII) {
		var dbyte = new Array(16);
		var i;
		var val;	// one hex digit
		if (isASCII) {
			// check length of data
			if (str.length > 16) {
				console.log("is too long, using the first 16 ASCII characters" );
			}
			// have ASCII data
			// 16 characters?
			if (str.length >= 16) {
				// 16 or more characters
				for(i=0; i<16; i++) {
					dbyte[i] = str.charCodeAt(i);
				}
			} else {
				 // less than 16 characters - fill with NULLs
				for(i=0; i<str.length; i++) {
					dbyte[i] = str.charCodeAt(i);
				}
				for( i=str.length; i<16; i++) {
					dbyte[i] = 0;
				}
			}
		} else {
			// have hex data - remove any spaces they used, then convert
			//str = remove_spaces(str);
			// check length of data
			if ( str.length != 32 ) {
				//console.log("\tget_value:\tstr = " + str + "\tisASCII = " + isASCII); //isASCII = false
				console.log("length wrong: Is " + str.length + " hex digits, but must be 128 bits (32 hex digits)");
				dbyte[0] = -1;
				return dbyte;
			}
			for( i=0; i<16; i++ ) {
				// isolate and convert this substring
				dbyte[i] = cvt_byte( str.substr(i*2,2) );
				if( dbyte[i] < 0 ) {
					// have an error
					dbyte[0] = -1;
					return dbyte;
				}
			}
		}
		// return successful conversion
		return dbyte;
	}
	//do the AES GF(2**8) multiplication
	// do this by the shift-and-"add" approach
	function aes_mul(a, b) {
		var res = 0;
		while(a > 0) {
		if((a&1) != 0)
			res = res ^ b;		// "add" to the result
			a >>>= 1;			// shift a to get next higher-order bit
			b <<= 1;			// shift multiplier also
		}
		// now reduce it modulo x**8 + x**4 + x**3 + x + 1
		var hbit = 0x10000;		// bit to test if we need to take action
		var modulus = 0x11b00;	// modulus - XOR by this to change value
		while(hbit >= 0x100) {
			if ((res & hbit) != 0) {
				res ^= modulus;	// XOR with the modulus
			}
			// prepare for the next loop
			hbit >>= 1;
			modulus >>= 1;
		}
		return res;
	}

	// apply the S-box substitution to the key expansion
	function SubWord(word_ary) {
		var i;
		for(i=0; i<16; i++) {
			word_ary[i] = S_enc[word_ary[i]];
		}
		return word_ary;
	}
	
	// rotate the bytes in a word
	function RotWord(word_ary) {
		return new Array(word_ary[1], word_ary[2], word_ary[3], word_ary[0]);
	}

	// calculate the first item Rcon[i] = { x^(i-1), 0, 0, 0 }
	// note we only return the first item
	function Rcon(exp) {
		var val = 2;
		var result = 1;
	
	   // remember to calculate x^(exp-1)
	   exp--;
	
	   // process the exponent using normal shift and multiply
	   while ( exp > 0 )
	   {
		  if ( (exp & 1) != 0 )
			 result = aes_mul( result, val );
	
		  // square the value
		  val = aes_mul( val, val );
	
		  // move to the next bit
		  exp >>= 1;
	   }
	
	   return result;
	}
	// round key generation
	// return a byte array with the expanded key information
	function key_expand( key )
	{
	   var temp = new Array(4);
	   var i, j;
	   var w = new Array(4*(Nr+1));

	   // copy initial key stuff
	   for( i=0; i<16; i++ )
	   {
		  w[i] = key[i];
	   }

	   // generate rest of key schedule using 32-bit words
	   i = 4;
	   while ( i < 4*(Nr+1))		// blocksize * ( rounds + 1 )
	   {
		  // copy word W[i-1] to temp
		  for( j=0; j<4; j++ )
			 temp[j] = w[(i-1)*4+j];

		  if ( i % 4 == 0)
		  {
			 // temp = SubWord(RotWord(temp)) ^ Rcon[i/4];
			 temp = RotWord( temp );
			 temp = SubWord( temp );
			 temp[0] ^= Rcon( i>>>2 );
		  }

		  // word = word ^ temp
		  for( j=0; j<4; j++ )
			 w[i*4+j] = w[(i-4)*4+j] ^ temp[j];

		  i++;
	   }

	   return w;
	}

	// do S-Box substitution
	function SubBytes(state, Sbox)
	{
	   var i;

	   for( i=0; i<16; i++ )
		  state[i] = Sbox[ state[i] ];

	   return state;
	}

	// shift each row as appropriate
	function ShiftRows(state)
	{
	   var t0, t1, t2, t3;

	   // top row (row 0) isn't shifted

	   // next row (row 1) rotated left 1 place
	   t0 = state[I10];
	   t1 = state[I11];
	   t2 = state[I12];
	   t3 = state[I13];
	   state[I10] = t1;
	   state[I11] = t2;
	   state[I12] = t3;
	   state[I13] = t0;

	   // next row (row 2) rotated left 2 places
	   t0 = state[I20];
	   t1 = state[I21];
	   t2 = state[I22];
	   t3 = state[I23];
	   state[I20] = t2;
	   state[I21] = t3;
	   state[I22] = t0;
	   state[I23] = t1;

	   // bottom row (row 3) rotated left 3 places
	   t0 = state[I30];
	   t1 = state[I31];
	   t2 = state[I32];
	   t3 = state[I33];
	   state[I30] = t3;
	   state[I31] = t0;
	   state[I32] = t1;
	   state[I33] = t2;

	   return state;
	}

	// inverset shift each row as appropriate
	function InvShiftRows(state)
	{
	   var t0, t1, t2, t3;

	   // top row (row 0) isn't shifted

	   // next row (row 1) rotated left 1 place
	   t0 = state[I10];
	   t1 = state[I11];
	   t2 = state[I12];
	   t3 = state[I13];
	   state[I10] = t3;
	   state[I11] = t0;
	   state[I12] = t1;
	   state[I13] = t2;

	   // next row (row 2) rotated left 2 places
	   t0 = state[I20];
	   t1 = state[I21];
	   t2 = state[I22];
	   t3 = state[I23];
	   state[I20] = t2;
	   state[I21] = t3;
	   state[I22] = t0;
	   state[I23] = t1;

	   // bottom row (row 3) rotated left 3 places
	   t0 = state[I30];
	   t1 = state[I31];
	   t2 = state[I32];
	   t3 = state[I33];
	   state[I30] = t1;
	   state[I31] = t2;
	   state[I32] = t3;
	   state[I33] = t0;

	   return state;
	}

	// process column info
	function MixColumns(state)
	{
	   var col;
	   var c0, c1, c2, c3;

	   for( col=0; col<4; col++ )
	   {
		  c0 = state[I(0,col)];
		  c1 = state[I(1,col)];
		  c2 = state[I(2,col)];
		  c3 = state[I(3,col)];

		  // do mixing, and put back into array
		  state[I(0,col)] = aes_mul(2,c0) ^ aes_mul(3,c1) ^ c2 ^ c3;
		  state[I(1,col)] = c0 ^ aes_mul(2,c1) ^ aes_mul(3,c2) ^ c3;
		  state[I(2,col)] = c0 ^ c1 ^ aes_mul(2,c2) ^ aes_mul(3,c3);
		  state[I(3,col)] = aes_mul(3,c0) ^ c1 ^ c2 ^ aes_mul(2,c3);
	   }

	   return state;
	}

	// inverse process column info
	function InvMixColumns(state)
	{
	   var col;
	   var c0, c1, c2, c3;

	   for( col=0; col<4; col++ )
	   {
		  c0 = state[I(0,col)];
		  c1 = state[I(1,col)];
		  c2 = state[I(2,col)];
		  c3 = state[I(3,col)];

		  // do inverse mixing, and put back into array
		  state[I(0,col)] = aes_mul(0x0e,c0) ^ aes_mul(0x0b,c1)
				^ aes_mul(0x0d,c2) ^ aes_mul(0x09,c3);
		  state[I(1,col)] = aes_mul(0x09,c0) ^ aes_mul(0x0e,c1)
				^ aes_mul(0x0b,c2) ^ aes_mul(0x0d,c3);
		  state[I(2,col)] = aes_mul(0x0d,c0) ^ aes_mul(0x09,c1)
				^ aes_mul(0x0e,c2) ^ aes_mul(0x0b,c3);
		  state[I(3,col)] = aes_mul(0x0b,c0) ^ aes_mul(0x0d,c1)
				^ aes_mul(0x09,c2) ^ aes_mul(0x0e,c3);
	   }

	   return state;
	}

	// insert subkey information
	function AddRoundKey( state, w, base )
	{
	   var col;

	   for( col=0; col<4; col++ )
	   {
		  state[I(0,col)] ^= w[base+col*4];
		  state[I(1,col)] ^= w[base+col*4+1];
		  state[I(2,col)] ^= w[base+col*4+2];
		  state[I(3,col)] ^= w[base+col*4+3];
	   }

	   return state;
	}

	// return a transposed array
	function transpose( msg )
	{
	   var row, col;
	   var state = new Array( 16 );

	   for( row=0; row<4; row++ )
		  for( col=0; col<4; col++ )
			 state[I(row,col)] = msg[I(col,row)];

	   return state;
	}

	// final AES state
	var AES_output = new Array(16);

	// format AES output
	// -- uses the global array DES_output
	function format_AES_output(bASCII)
	{
	   var i;
	   var bits;
	   var str="";

	   // what type of data do we have to work with?
	   if (bASCII)
	   {
		  // convert each set of bits back to ASCII
		  for( i=0; i<16; i++ )
			 str += String.fromCharCode( AES_output[i] );
	   }
	   else 
	   {
		  // output hexdecimal data (insert spaces)
		  str = cvt_hex8( AES_output[0] );
		  for( i=1; i<16; i++ )
		  {
			 str += "" + cvt_hex8( AES_output[i] );
		  }
	   }
	   return str;
	}

	// do encrytion
	function aes_encrypt(str, key, bASCII)
	{
	   //console.log("  aes_encrypt:\tstr = " + str + "\tkey = " + key + "\t bASCII = " + bASCII);
	   var w = new Array( 4*(Nr+1) );			// subkey information
	   var state = new Array( 16 );			// working state
	   var round;

	   //accumulated_output_info = "";

	   // get the message from the user
	   // also check if it is ASCII or hex
	   var msg = get_value(str, bASCII);

	   // problems??
	   if ( msg[0] < 0 )
	   {
		  return;
	   }

	   // get the key from the user
	   var key = get_value(key, false);
	   // problems??
	   if ( key[0] < 0 )
	   {
		  return;
	   }

	   // expand the key
	   w = key_expand( key );

	   // initial state = message in columns (transposed from what we input)
	   state = transpose( msg );

	   // display the round key - Transpose due to the way it is stored/used
	   state = AddRoundKey(state, w, 0);

	   for( round=1; round<Nr; round++ )
	   {
		  state = SubBytes(state, S_enc);
		  state = ShiftRows(state);
		  state = MixColumns(state);
		  // display the round key - Transpose due to the way it is stored/used
		  // note here the spec uses 32-bit words, we are using bytes, so an extra *4
		  state = AddRoundKey(state, w, round*4*4);
	   }

	   SubBytes(state, S_enc);
	   ShiftRows(state);
	   AddRoundKey(state, w, Nr*4*4);

	   // process output
	   AES_output = transpose( state );
	   var szOutput = format_AES_output(!bASCII);
	   return szOutput;
	}

	// do decryption
	function aes_decrypt(str, key, bASCII)
	{
	   //console.log("  aes_decrypt:\tstr = " + str + "\tkey = " + key + "\tbASCII = " + bASCII);
	   var w = new Array( 4*(Nr+1) );			// subkey information
	   var state = new Array( 16 );			// working state
	   var round;

	   //accumulated_output_info = "";

	   // get the message from the user
	   // also check if it is ASCII or hex
	   var msg = get_value(str, bASCII);

	   // problems??
	   if ( msg[0] < 0 )
	   {
		  return;
	   }
	   
	   // get the key from the user
	   var key = get_value(key, false);
	   // problems??
	   if ( key[0] < 0 )
	   {
		  return;
	   }

	   // expand the key
	   w = key_expand( key );

	   // initial state = message
	   state = transpose( msg );
	   // display the round key - Transpose due to the way it is stored/used
	   state = AddRoundKey(state, w, Nr*4*4);

	   for( round=Nr-1; round>=1; round-- )
	   {
		  state = InvShiftRows(state);
		  state = SubBytes(state, S_dec);
		  // display the round key - Transpose due to the way it is stored/used
		  // note here the spec uses 32-bit words, we are using bytes, so an extra *4
		  state = AddRoundKey(state, w, round*4*4);
		  state = InvMixColumns(state);
	   }

	   InvShiftRows(state);
	   SubBytes(state, S_dec);
	   AddRoundKey(state, w, 0);

	   // process output
	   AES_output = transpose( state );
	   var szOutput = format_AES_output(!bASCII);
	   return szOutput;
	}
	window.aes_encrypt = aes_encrypt;
	window.aes_decrypt = aes_decrypt;
	window.console = window.console || {
		log: function() {}
	};
}());