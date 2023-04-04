const { network, ethers } = require('hardhat')
const { developmentChains, networkConfig } = require('../helper-hardhat-config')

const BASE_FEE = ethers.utils.parseEther('0.25') // 0.25 LINK is the premium cost
const GAS_PRICE_LINK = 1e8

module.exports = async function ({ getNamedAccounts, deployments }) {
	const { deploy, log } = deployments
	const { deployer } = await getNamedAccounts()
	// const chainId = network.config.chainId

	if (developmentChains.includes(network.name)) {
		log('Local network! Deploying mocks...')
		await deploy('VRFCoordinatorV2Mock', {
			from: deployer,
			log: true,
			args: [BASE_FEE, GAS_PRICE_LINK],
		})
		log('==========================================')
	}
}

module.exports.tags = ['all', 'mocks']
