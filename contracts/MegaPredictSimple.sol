// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MegaPredictSimple {
    address public owner;
    uint256 public currentRoundNumber;

    struct Round {
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;
        int256 endPrice;
        uint8 aiPrediction;
        uint256 aiConfidence;
        bool resolved;
        uint256 totalFollowAI;
        uint256 totalAgainstAI;
        uint256 rewardAmount;
    }

    mapping(uint256 => Round) public rounds;

    event RoundStarted(uint256 indexed roundNumber, int256 startPrice, uint8 aiPrediction);
    event BetPlaced(uint256 indexed roundNumber, address indexed user, bool followAI, uint256 amount);
    event RoundResolved(uint256 indexed roundNumber, int256 endPrice);

    constructor() {
        owner = msg.sender;
        currentRoundNumber = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function startRound(
        int256 _startPrice,
        uint8 _aiPrediction,
        uint256 _aiConfidence
    ) external onlyOwner {
        if (currentRoundNumber > 0) {
            require(rounds[currentRoundNumber].resolved, "Resolve previous round");
        }

        currentRoundNumber++;
        Round storage r = rounds[currentRoundNumber];
        r.startTime = block.timestamp;
        r.endTime = block.timestamp + 900; // 15 minutes
        r.startPrice = _startPrice;
        r.aiPrediction = _aiPrediction;
        r.aiConfidence = _aiConfidence;
        r.resolved = false;

        emit RoundStarted(currentRoundNumber, _startPrice, _aiPrediction);
    }

    function placeBet(bool _followAI) external payable {
        require(msg.value > 0, "Zero bet");
        require(currentRoundNumber > 0, "No round");

        Round storage r = rounds[currentRoundNumber];
        require(!r.resolved, "Resolved");
        require(block.timestamp < r.endTime, "Ended");

        if (_followAI) {
            r.totalFollowAI += msg.value;
        } else {
            r.totalAgainstAI += msg.value;
        }

        emit BetPlaced(currentRoundNumber, msg.sender, _followAI, msg.value);
    }

    function resolveRound(int256 _endPrice) external onlyOwner {
        require(currentRoundNumber > 0, "No round");
        Round storage r = rounds[currentRoundNumber];
        require(!r.resolved, "Already resolved");

        r.endPrice = _endPrice;
        r.resolved = true;
        r.rewardAmount = r.totalFollowAI + r.totalAgainstAI;

        emit RoundResolved(currentRoundNumber, _endPrice);
    }

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
        Round storage r = rounds[_roundNumber];
        return (
            r.startTime,
            r.endTime,
            r.startPrice,
            r.endPrice,
            r.aiPrediction,
            r.aiConfidence,
            r.resolved,
            r.totalFollowAI,
            r.totalAgainstAI,
            r.rewardAmount
        );
    }
}
