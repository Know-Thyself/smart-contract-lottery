// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
// TODO
// Raffle
// Enter the lottery by paying some amount
// Pick a verifyabily random winner using Chainlink Oracle
// Automate winner selection every day/weeek or any given time using Chainlink Keepers

error Raffle__NotEnoughETHEntered();

contract Raffle {
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        s_players.push(payable(msg.sender));
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }
}
