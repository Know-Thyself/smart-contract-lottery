const { network, getNamedAccounts, deployments, ethers } = require('hardhat')
const {
	developmentChains,
	networkConfig,
} = require('../../helper-hardhat-config')
const { assert, expect } = require('chai')

developmentChains.includes(network.name)
	? describe.skip
	: describe('Raffle', () => {
			let raffle, raffleContract, deployer, player, raffleEntranceFee, accounts
			beforeEach(async function () {
				deployer = (await getNamedAccounts()).deployer
				await deployments.fixture(['mocks', 'raffle'])
				raffle = await ethers.getContract('Raffle', deployer)
				raffleEntranceFee = await raffle.getEntranceFee()
			})

			describe('fulfillRandomWords', () => {
				it('works with live Chainlink keepers and VRF to get a random winner', async () => {
					const startingTimestamp = await raffle.getLatestTimestamp()
					const accounts = await ethers.getSigners()
					await new Promise(async (resolve, reject) => {
						raffle.once('WinnerPicked', async () => {
							console.log('WinnerPicked event fired')
							try {
								const recentWinner = await raffle.getRecentWinner()
								const raffleState = await raffle.getRaffleState()
								const winnerUpdatedBalance = accounts[0].getBalance()
								const endingTimestamp = await raffle.getLatestTimestamp()

								await expect(raffle.getPlayer()).to.be.reverted
								assert.equal(recentWinner.toString(), accounts[0].address)
								assert.equal(raffleState, 0)
								assert.equal(
									(await winnerUpdatedBalance).toString(),
									winnerInitialBalance.add(raffleEntranceFee).toString()
								)
								assert(endingTimestamp > startingTimestamp)
								resolve()
							} catch (error) {
								console.log(error)
								reject(error)
							}
						})
						await raffle.enterRaffle({ value: raffleEntranceFee })
						const winnerInitialBalance = await accounts[0].getBalance()
					})
				})
			})
	  })
