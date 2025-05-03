import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LotteryFactoryModule = buildModule("LotteryFactoryModule", (m) => {
// Deploy the LotteryFactory contract with the specified parameters
const lotteryFactory = m.contract("LotteryFactory", [ "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"]);
return { lotteryFactory };
});

export default LotteryFactoryModule;
