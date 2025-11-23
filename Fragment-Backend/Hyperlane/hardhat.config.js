import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    fragment: {
      url: "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io",
      chainId: 2763843736868000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    sagaevm: {
      url: "https://5464.rpc.thirdweb.com",
      chainId: 5464,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

