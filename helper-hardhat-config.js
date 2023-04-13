const { ethers } = require('hardhat')

const networkConfig = {
	11155111: {
		name: 'sepolia',
		// vrfCoordinatorV2: '0x8103b0a8a00be2ddc778e6e7eaa21791cd364625',
		vrfCoordinatorV2: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
		entranceFee: ethers.utils.parseEther('0.01'),
		gasLane:
			'0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
		subscriptionId: '894', // temp id to be replace with a real id
		callbackGasLimit: '400000',
		interval: '30',
		keepersUpdateInterval: '30',
	},
	31337: {
		name: 'hardhat',
		entranceFee: ethers.utils.parseEther('0.01'),
		gasLane:
			'0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c', // it doesn't matter what gas lane we use here
		callbackGasLimit: '400000',
		interval: '30',
	},
}

const developmentChains = ['hardhat', 'localhost']

module.exports = {
	networkConfig,
	developmentChains,
}
