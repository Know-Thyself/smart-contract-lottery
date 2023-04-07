const { network, getNamedAccounts, deployments, ethers } = require('hardhat')
const {
	developmentChains,
	networkConfig,
} = require('../../helper-hardhat-config')
const { assert, expect } = require('chai')

!developmentChains.includes(network.name)
	? describe.skip
	: describe('Raffle', () => {
			let raffle,
				raffleContract,
				deployer,
				player,
				vrfCoordinatorV2Mock,
				raffleEntranceFee,
				interval,
				accounts
			const chainId = network.config.chainId
			beforeEach(async function () {
				accounts = await ethers.getSigners()
				player = accounts[1]
				deployer = (await getNamedAccounts()).deployer
				await deployments.fixture(['mocks', 'raffle'])
				raffleContract = await ethers.getContract('Raffle') // Returns a new connection to the Raffle contract
				raffle = raffleContract.connect(player) // Returns a new instance of the Raffle contract connected to player
				raffle = await ethers.getContract('Raffle', deployer)
				vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
				raffleEntranceFee = await raffle.getEntranceFee()
			})

			describe('constructor', () => {
				it('Initializes the raffle correctly', async function () {
					const raffleState = await raffle.getRaffleState()
					interval = await raffle.getInterval()
					assert.equal(raffleState.toString(), '0')
					assert.equal(interval.toString(), networkConfig[chainId]['interval'])
				})
			})

			describe('enterRaffle', () => {
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

				it('emits event on enter', async () => {
					await expect(
						raffle.enterRaffle({ value: raffleEntranceFee })
					).to.emit(raffle, 'RaffleEnter')
				})

				it('does not allow to enter raffle when the raffle state is calculating', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.send('evm_mine', [])
					await raffle.performUpkeep([])
					await expect(
						raffle.enterRaffle({ value: raffleEntranceFee })
					).to.be.revertedWith('Raffle__IsClosed')
				})
			})

			describe('checkUpkeep', () => {
				it('should return false if players have not sent enough ETH', async () => {
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.send('evm_mine', [])
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
					assert(!upkeepNeeded)
					// or
					// assert.equal(upkeepNeeded, false)
				})

				it('returns false if raffle is not open', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.send('evm_mine', [])
					await raffle.performUpkeep([])
					// another way of sending a blank object would be:
					// await raffle.performUpkeep('0x')
					const raffleState = await raffle.getRaffleState()
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
					assert.equal(raffleState.toString(), '1')
					assert.equal(upkeepNeeded, false)
				})

				it("returns false if enough time hasn't passed", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() - 5,
					]) // use a higher number here if this test fails
					await network.provider.request({ method: 'evm_mine', params: [] })
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep('0x') // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
					assert(!upkeepNeeded)
				})

				it('returns true if enough time has passed, has players, eth, and is open', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.request({ method: 'evm_mine', params: [] })
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep('0x') // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
					assert(upkeepNeeded)
				})
			})

			describe('performUpkeep', () => {
				it('can only run if checkUpkeep is true', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.send('evm_mine', [])
					const transaction = await raffle.performUpkeep('0x')
					assert(transaction)
				})

				it('reverts if checkUpkeep is false', async () => {
					await expect(raffle.performUpkeep([])).to.be.revertedWith(
						'Raffle__UpkeepNotNeeded'
					)
				})

				it('updates the raffle state and emits a requestId', async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.request({ method: 'evm_mine', params: [] })
					const transactionResponse = await raffle.performUpkeep([])
					const transactionReceipt = await transactionResponse.wait(1)
					const raffleState = await raffle.getRaffleState()
					const requestId = transactionReceipt.events[1].args.requestId
					assert(requestId.toNumber() > 0)
					assert(raffleState === 1) // 0 = open, 1 = calculating
				})
			})

			describe('fulfillRandomWords', function () {
				beforeEach(async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee })
					await network.provider.send('evm_increaseTime', [
						interval.toNumber() + 1,
					])
					await network.provider.request({ method: 'evm_mine', params: [] })
				})

				it('can only be called after performUpkeep', async () => {
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
					).to.be.revertedWith('nonexistent request')
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
					).to.be.revertedWith('nonexistent request')
				})

				it('picks a winner, resets, and sends money', async () => {
					const additionalEntrances = 3 // to test
					const startingIndex = 2
					for (
						let i = startingIndex;
						i < startingIndex + additionalEntrances;
						i++
					) {
						raffle = raffleContract.connect(accounts[i])
						await raffle.enterRaffle({ value: raffleEntranceFee })
					}
					const startingTimeStamp = await raffle.getLastTimeStamp()
				})

				it('picks a winner, resets, and sends money', async () => {
					const additionalEntrances = 3 // to test
					const startingIndex = 2
					for (
						let i = startingIndex;
						i < startingIndex + additionalEntrances;
						i++
					) {
						raffle = raffleContract.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
						await raffle.enterRaffle({ value: raffleEntranceFee })
					}
					const startingTimeStamp = await raffle.getLastTimeStamp() // stores starting timestamp (before we fire our event)

					// This will be more important for our staging tests...
					await new Promise(async (resolve, reject) => {
						raffle.once('WinnerPicked', async () => {
							// event listener for WinnerPicked
							console.log('WinnerPicked event fired!')
							try {
								const recentWinner = await raffle.getRecentWinner()
								const raffleState = await raffle.getRaffleState()
								const winnerBalance = await accounts[2].getBalance()
								const endingTimeStamp = await raffle.getLastTimeStamp()
								await expect(raffle.getPlayer(0)).to.be.reverted
								// Comparisons to check if our ending values are correct:
								assert.equal(recentWinner.toString(), accounts[2].address)
								assert.equal(raffleState, 0)
								assert.equal(
									winnerBalance.toString(),
									startingBalance
										.add(
											raffleEntranceFee
												.mul(additionalEntrances)
												.add(raffleEntranceFee)
										)
										.toString()
								)
								assert(endingTimeStamp > startingTimeStamp)
								resolve()
							} catch (e) {
								reject(e)
							}
						})

						// kicking off the event by mocking the chainlink keepers and vrf coordinator
						const tx = await raffle.performUpkeep('0x')
						const txReceipt = await tx.wait(1)
						const startingBalance = await accounts[2].getBalance()
						await vrfCoordinatorV2Mock.fulfillRandomWords(
							txReceipt.events[1].args.requestId,
							raffle.address
						)
					})
				})
			})
	  })
