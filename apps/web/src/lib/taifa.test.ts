import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { taifaMessageId, taifaMobile, taifaRejection, TAIFA_SMS_URL } from "./taifa";

describe("taifa v2", () => {
  it("uses the v2 endpoint", () => {
    assert.equal(TAIFA_SMS_URL, "https://api.taifamobile.co.ke/v2/sms/sendsms");
  });

  it("treats status_code 1000 as success (array, object, numeric)", () => {
    assert.equal(taifaRejection('[{"status_code":"1000","status_desc":"Success","message_id":42}]'), null);
    assert.equal(taifaRejection('{"status_code":"1000","status_desc":"Success"}'), null);
    assert.equal(taifaRejection('[{"status_code":1000}]'), null);
    assert.equal(taifaMessageId('[{"status_code":"1000","message_id":42}]'), "42");
  });

  it("surfaces non-1000 codes", () => {
    assert.equal(
      taifaRejection('[{"status_code":"1004","status_desc":"Low credits"}]'),
      "Taifa 1004: Low credits",
    );
  });

  it("flags non-JSON bodies", () => {
    assert.equal(taifaRejection("<html>404</html>"), "Bad response from Taifa: <html>404</html>");
  });

  it("strips the plus from E.164", () => {
    assert.equal(taifaMobile("+254712345678"), "254712345678");
  });
});
