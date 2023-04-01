/** @type import('hardhat/config').HardhatUserConfig */
require('@nomicfoundation/hardhat-toolbox')
require('hardhat-deploy')
require('hardhat-contract-sizer')
require('dotenv').config()

module.exports = {
  solidity: "0.8.18",
};
