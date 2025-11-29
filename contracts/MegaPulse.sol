// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MegaPulse {
    enum Position { None, Up, Down }

    struct Round {
        uint256 startTimestamp;
        int256 startPrice;
        int256 endPrice;
        bool resolved;
        uint256 totalUpPool;
        uint256 totalDownPool;
    }

    struct Bet {
        Position position;
        uint256 amount;
        bool claimed;
    }

    uint256 public currentRoundIndex;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Bet)) public bets;
    
    event RoundStarted(uint256 indexed roundId, int256 startPrice, uint256 timestamp);
    event BetPlaced(uint256 indexed roundId, address indexed user, Position position, uint256 amount);
    event RoundEnded(uint256 indexed roundId, int256 endPrice);

    constructor() {
        // Initialize first round just to start
        currentRoundIndex = 1;
        rounds[1].startTimestamp = block.timestamp;
        rounds[1].startPrice = 95000 * 10**8; // Mock start price
    }

    // 1. User places a bet
    function placeBet(bool isUp) external payable {
        require(msg.value > 0, "Bet amount must be > 0");
        require(!rounds[currentRoundIndex].resolved, "Round resolved");

        Bet storage bet = bets[currentRoundIndex][msg.sender];
        require(bet.position == Position.None, "Already bet this round");

        if (isUp) {
            bet.position = Position.Up;
            rounds[currentRoundIndex].totalUpPool += msg.value;
        } else {
            bet.position = Position.Down;
            rounds[currentRoundIndex].totalDownPool += msg.value;
        }
        
        bet.amount = msg.value;
        emit BetPlaced(currentRoundIndex, msg.sender, bet.position, msg.value);
    }

    // 2. Resolve round (Called by Frontend/Bot for Demo)
    // In production, this would be an Oracle or automated bot
    function executeRound(int256 _endPrice) external {
        Round storage round = rounds[currentRoundIndex];
        require(!round.resolved, "Already resolved");
        
        round.endPrice = _endPrice;
        round.resolved = true;
        emit RoundEnded(currentRoundIndex, _endPrice);

        // Start Next Round Immediately
        currentRoundIndex++;
        rounds[currentRoundIndex].startTimestamp = block.timestamp;
        rounds[currentRoundIndex].startPrice = _endPrice;
        emit RoundStarted(currentRoundIndex, _endPrice, block.timestamp);
    }

    // 3. Claim Winnings
    function claim(uint256 roundId) external {
        Round storage round = rounds[roundId];
        require(round.resolved, "Round not resolved");
        
        Bet storage bet = bets[roundId][msg.sender];
        require(!bet.claimed, "Already claimed");
        require(bet.amount > 0, "No bet");

        bool upWon = round.endPrice > round.startPrice;
        uint256 payout = 0;

        if (upWon && bet.position == Position.Up) {
            payout = bet.amount + (bet.amount * round.totalDownPool / round.totalUpPool);
        } else if (!upWon && bet.position == Position.Down) {
            payout = bet.amount + (bet.amount * round.totalUpPool / round.totalDownPool);
        }
        
        // If one side had no bets, refund
        if (round.totalUpPool == 0 || round.totalDownPool == 0) {
            payout = bet.amount;
        }

        require(payout > 0, "You lost");
        bet.claimed = true;
        payable(msg.sender).transfer(payout);
    }
}