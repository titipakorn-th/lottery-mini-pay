import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LotteryFactoryModule = buildModule("LotteryFactoryModule", (m) => {
// Deploy the LotteryFactory contract with the specified parameters
const lotteryFactory = m.contract("LotteryFactory", [ "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B"]);
return { lotteryFactory };
});

export default LotteryFactoryModule;
