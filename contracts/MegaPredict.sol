// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MegaPredict {
    address public owner;
    uint256 public currentRoundNumber;

    struct Round {
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;
        int256 endPrice;
        uint8 aiPrediction;      // 0 = None, 1 = Up, 2 = Down
        uint256 aiConfidence;    // 0-100
        bool resolved;
        uint256 totalFollowAI;
        uint256 totalAgainstAI;
        uint256 rewardAmount;
    }

    struct Bet {
        bool followAI;
        uint256 amount;
        bool claimed;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Bet)) public bets;

    event RoundStarted(uint256 indexed roundNumber, int256 startPrice, uint8 aiPrediction, uint256 aiConfidence);
    event BetPlaced(uint256 indexed roundNumber, address indexed user, bool followAI, uint256 amount);
    event RoundResolved(uint256 indexed roundNumber, int256 endPrice, bool aiWon);
    event RewardClaimed(uint256 indexed roundNumber, address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
        currentRoundNumber = 0; // Start at 0, first round will be 1
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Start new round (called by operator bot)
    function startRound(
        int256 _startPrice,
        uint8 _aiPrediction,
        uint256 _aiConfidence
    ) external onlyOwner {
        require(_aiPrediction == 1 || _aiPrediction == 2, "Invalid prediction");
        require(_aiConfidence > 0 && _aiConfidence <= 100, "Invalid confidence");

        // Ensure previous round is resolved (if exists)
        if (currentRoundNumber > 0) {
            require(rounds[currentRoundNumber].resolved, "Previous round not resolved");
        }

        currentRoundNumber++;

        Round storage newRound = rounds[currentRoundNumber];
        newRound.startTime = block.timestamp;
        newRound.endTime = block.timestamp + 15 minutes;
        newRound.startPrice = _startPrice;
        newRound.aiPrediction = _aiPrediction;
        newRound.aiConfidence = _aiConfidence;
        newRound.resolved = false;

        emit RoundStarted(currentRoundNumber, _startPrice, _aiPrediction, _aiConfidence);
    }

    // Place bet
    function placeBet(bool _followAI) external payable {
        require(msg.value > 0, "Bet must be > 0");
        require(currentRoundNumber > 0, "No active round");

        Round storage round = rounds[currentRoundNumber];
        require(!round.resolved, "Round already resolved");
        require(block.timestamp < round.endTime, "Round ended");

        Bet storage userBet = bets[currentRoundNumber][msg.sender];
        require(userBet.amount == 0, "Already bet this round");

        userBet.followAI = _followAI;
        userBet.amount = msg.value;
        userBet.claimed = false;

        if (_followAI) {
            round.totalFollowAI += msg.value;
        } else {
            round.totalAgainstAI += msg.value;
        }

        emit BetPlaced(currentRoundNumber, msg.sender, _followAI, msg.value);
    }

    // Resolve round (called by operator bot)
    function resolveRound(int256 _endPrice) external onlyOwner {
        require(currentRoundNumber > 0, "No rounds");

        Round storage round = rounds[currentRoundNumber];
        require(!round.resolved, "Already resolved");

        round.endPrice = _endPrice;
        round.resolved = true;

        // Determine if AI won
        bool aiWon = false;
        if (round.aiPrediction == 1 && _endPrice > round.startPrice) {
            aiWon = true; // AI predicted UP and price went up
        } else if (round.aiPrediction == 2 && _endPrice < round.startPrice) {
            aiWon = true; // AI predicted DOWN and price went down
        }

        // Calculate reward pool
        uint256 totalPool = round.totalFollowAI + round.totalAgainstAI;
        round.rewardAmount = totalPool;

        emit RoundResolved(currentRoundNumber, _endPrice, aiWon);
    }

    // Claim rewards
    function claimReward(uint256 _roundNumber) external {
        require(_roundNumber > 0 && _roundNumber <= currentRoundNumber, "Invalid round");

        Round storage round = rounds[_roundNumber];
        require(round.resolved, "Round not resolved");

        Bet storage userBet = bets[_roundNumber][msg.sender];
        require(userBet.amount > 0, "No bet found");
        require(!userBet.claimed, "Already claimed");

        // Determine if user won
        bool aiWon = false;
        if (round.aiPrediction == 1 && round.endPrice > round.startPrice) {
            aiWon = true;
        } else if (round.aiPrediction == 2 && round.endPrice < round.startPrice) {
            aiWon = true;
        }

        bool userWon = (userBet.followAI && aiWon) || (!userBet.followAI && !aiWon);
        require(userWon, "You lost");

        // Calculate payout
        uint256 winningPool = aiWon ? round.totalFollowAI : round.totalAgainstAI;
        uint256 losingPool = aiWon ? round.totalAgainstAI : round.totalFollowAI;

        uint256 payout = 0;
        if (winningPool > 0) {
            // Proportional share of winnings + original bet
            payout = userBet.amount + (userBet.amount * losingPool / winningPool);
        }

        require(payout > 0, "No payout");

        userBet.claimed = true;
        payable(msg.sender).transfer(payout);

        emit RewardClaimed(_roundNumber, msg.sender, payout);
    }

    // Get round data (view function for frontend)
    function getRound(uint256 _roundNumber) external view returns (
        uint256 startTime,
        uint256 endTime,
        int256 startPrice,
        int256 endPrice,
        uint8 aiPrediction,
        uint256 aiConfidence,
        bool resolved,
        uint256 totalFollowAI,
        uint256 totalAgainstAI,
        uint256 rewardAmount
    ) {
        Round storage round = rounds[_roundNumber];
        return (
            round.startTime,
            round.endTime,
            round.startPrice,
            round.endPrice,
            round.aiPrediction,
            round.aiConfidence,
            round.resolved,
            round.totalFollowAI,
            round.totalAgainstAI,
            round.rewardAmount
        );
    }

    // Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // Emergency withdraw (only owner, only if no active rounds)
    function emergencyWithdraw() external onlyOwner {
        require(currentRoundNumber == 0 || rounds[currentRoundNumber].resolved, "Active round exists");
        payable(owner).transfer(address(this).balance);
    }
}
