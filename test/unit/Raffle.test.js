const {
	network,
	getNamedAccounts,
	deployments,
	ethers,
	getChainId,
} = require('hardhat')
const {
	developmentChains,
	networkConfig,
} = require('../../helper-hardhat-config')
const { assert, expect } = require('chai')

!developmentChains.includes(network.name)
	? describe.skip
	: describe('Raffle', async function () {
			let raffle, deployer, vrfCoordinatorV2Mock, raffleEntranceFee
			const chainId = network.config.chainId
			beforeEach(async function () {
				deployer = (await getNamedAccounts()).deployer
				await deployments.fixture(['all'])
				raffle = await ethers.getContract('Raffle', deployer)
				vrfCoordinatorV2Mock = ethers.getContract(
					'VRFCoordinatorV2Mock',
					deployer
				)
				raffleEntranceFee = raffle.getEntranceFee()
			})

			describe('constructor', async function () {
				it('Initializes the raffle correctly', async function () {
					const raffleState = await raffle.getRaffleState()
					const interval = await raffle.getInterval()
					assert.equal(raffleState.toString(), '0')
					assert.equal(interval.toString(), networkConfig[chainId]['interval'])
				})
			})

			describe('enterRaffle', async () => {
				it('reverts when entrance fee is not fully paid', async () => {
					await expect(raffle.enterRaffle()).to.be.revertedWith(
						'Raffle__NotEnoughETHEntered'
					)
        })
        
				it('records players when they enter the raffle', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					const player = await raffle.getPlayer(0)
					assert.equal(player, deployer)
				})
			})
	  })
