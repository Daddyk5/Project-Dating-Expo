import { afterAll, beforeEach } from "vitest";
import { setKeyResolverForTests } from "../src/auth/jwt";
import { setProviderForTests } from "../src/ai/provider";
import { resetQuotaForTests } from "../src/ai/service";
import { cleanup, fakeAi, keys } from "./helpers";

setKeyResolverForTests(async () => (await keys).publicKey);
setProviderForTests(fakeAi);

beforeEach(() => resetQuotaForTests());
afterAll(cleanup);
