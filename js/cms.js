// {{{
// output of scripts/javascript.php
// I should be replaced with production deploy keys
(function(window, asmCrypto) {

var pubkey = asmCrypto.base64_to_bytes('WyJhZGJiMGEwNGQ5YzRiYjMxNWQzMTA2YzQwZjE1YzBmYzNlZmJjMmJmODkyNGU4ODA0NzU5OTk1MDRiNmE0ZGJiMWZjMjZhYTdkNmI1N2Q0YjFjMDhhYTM3ZDQ0MGYxMDJiMDJmZGZiMmE5ZTNlNjAzODVmZGJhODFjZmY5Y2E2OSIsIjAxMDAwMSJd'); 
pubkey = JSON.parse(asmCrypto.bytes_to_string(pubkey));
pubkey[0] = asmCrypto.hex_to_bytes(pubkey[0])
pubkey[1] = asmCrypto.hex_to_bytes(pubkey[1])

function verify_cms_content(content, signature)
{
	var hash = asmCrypto.SHA256.hex(content);
	signature = asmCrypto.base64_to_bytes(signature);
	try {
		return asmCrypto.RSA_PSS_SHA256.verify(signature, hash, pubkey);
	} catch (e) {
		/* rubbish data, invalid anyways */
		return false;
	}
}

window.cms_content = function(socket, ctx, buffer)
{
		var data = {}
			, headers = ['X-Mega-Authenticity', 'Content-Type', 'X-Label']
		for (var i in headers) {
			try {
				data[headers[i]] = socket.getResponseHeader(headers[i]);
			} catch (e) {}
		}

		if (verify_cms_content(socket.response, data['X-Mega-Authenticity'])) {
			var response = socket.response
			switch (ctx.expects || data['Content-Type']) {
			case 'download':
				var io = new MemoryIO("temp", {});
				io.begin = function() {};
				io.setCredentials("", response.byteLength, "", [], []);
				io.write(response, 0, function() {
					io.download(data['X-Label'], '');
				});
				break;
			case 'application/json':
				try {
					response = JSON.parse(ab_to_str(response))
				} catch (e) {
					/* invalid json, weird case */
					return ctx.callback(true, {} , ctx);
				}
				break;
			}
			ctx.callback(false, { buffer: response, mime: data['Content-Type']}, ctx);
		} else {
				ctx.callback(true, {} , ctx);
		}
}

})(this, asmCrypto)
// }}}

/* This is criminal, but it works! (This won't be on production) */
old_api_req = api_req;
api_req = function(req, ctx, c)
{
	if (req.a == "blob") {
		var q = getxhr();
		q.onload = function() {
			cms_content(q, ctx);
		};
		q.responseType = 'arraybuffer';
		q.open("GET", "/blobs.php?id=" + req.id);
		q.send();
		return;
	}

	return old_api_req(req, ctx, c);
};
