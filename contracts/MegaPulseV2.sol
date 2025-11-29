// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MegaPulse V2 - Prize Pool Prediction Market
 * @notice Fast-paced BTC price prediction with instant payouts on MegaETH
 */
contract MegaPulseV2 {
    enum Position { None, Up, Down }

    struct Round {
        uint256 startTimestamp;
        int256 startPrice;
        int256 endPrice;
        bool resolved;
        uint256 totalUpAmount;      // Total ETH bet on UP
        uint256 totalDownAmount;    // Total ETH bet on DOWN
        uint256 rewardBaseCalAmount; // For payout calculation
        uint256 rewardAmount;        // Total rewards to distribute
        bool prizeClaimed;           // Track if prizes were distributed
    }

    struct BetInfo {
        Position position;
        uint256 amount;
        bool claimed;
    }

    uint256 public currentRoundId;
    uint256 public treasuryFee = 200; // 2% (200/10000)
    uint256 public constant FEE_BASE = 10000;

    address public treasuryAddress;
    uint256 public treasuryAmount; // Accumulated treasury fees

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => BetInfo)) public ledger;
    mapping(uint256 => address[]) public roundBettors; // Track all bettors per round

    event RoundStarted(uint256 indexed roundId, int256 startPrice, uint256 timestamp);
    event BetPlaced(
        uint256 indexed roundId,
        address indexed user,
        Position position,
        uint256 amount,
        uint256 upPool,
        uint256 downPool
    );
    event RoundEnded(
        uint256 indexed roundId,
        int256 endPrice,
        uint256 totalPrizePool,
        Position winningPosition
    );
    event RewardsClaimed(uint256 indexed roundId, address indexed user, uint256 amount);
    event TreasuryClaimed(uint256 amount);

    constructor() {
        treasuryAddress = msg.sender;
        currentRoundId = 1;

        // Initialize first round
        Round storage round = rounds[1];
        round.startTimestamp = block.timestamp;
        round.startPrice = 95000 * 10**8; // Mock BTC price

        emit RoundStarted(1, round.startPrice, block.timestamp);
    }

    /**
     * @notice Bet on UP or DOWN for current round
     * @param isUp true for UP, false for DOWN
     */
    function placeBet(bool isUp) external payable {
        uint256 roundId = currentRoundId;
        Round storage round = rounds[roundId];

        require(msg.value > 0, "Bet amount must be > 0");
        require(!round.resolved, "Round already ended");
        require(ledger[roundId][msg.sender].amount == 0, "Already bet this round");

        // Update user's bet
        Position position = isUp ? Position.Up : Position.Down;
        ledger[roundId][msg.sender] = BetInfo({
            position: position,
            amount: msg.value,
            claimed: false
        });

        // Track bettor
        roundBettors[roundId].push(msg.sender);

        // Update pool amounts
        if (isUp) {
            round.totalUpAmount += msg.value;
        } else {
            round.totalDownAmount += msg.value;
        }

        emit BetPlaced(
            roundId,
            msg.sender,
            position,
            msg.value,
            round.totalUpAmount,
            round.totalDownAmount
        );
    }

    /**
     * @notice Resolve current round and distribute prizes automatically
     * @param _endPrice The ending BTC price
     */
    function executeRound(int256 _endPrice) external {
        uint256 roundId = currentRoundId;
        Round storage round = rounds[roundId];

        require(!round.resolved, "Already resolved");
        require(round.totalUpAmount > 0 || round.totalDownAmount > 0, "No bets placed");

        round.endPrice = _endPrice;
        round.resolved = true;

        // Calculate total pool
        uint256 totalPool = round.totalUpAmount + round.totalDownAmount;

        // Deduct treasury fee
        uint256 treasuryAmt = (totalPool * treasuryFee) / FEE_BASE;
        treasuryAmount += treasuryAmt;

        // Remaining prize pool after fee
        uint256 prizePool = totalPool - treasuryAmt;
        round.rewardAmount = prizePool;

        // Determine winner
        bool upWon = _endPrice > round.startPrice;
        Position winningPosition = upWon ? Position.Up : Position.Down;

        // Set reward calculation base (winning pool amount)
        round.rewardBaseCalAmount = upWon ? round.totalUpAmount : round.totalDownAmount;

        // Handle case where one side has no bets (refund all)
        if (round.totalUpAmount == 0 || round.totalDownAmount == 0) {
            round.rewardBaseCalAmount = totalPool;
            round.rewardAmount = totalPool; // Full refund, no fee
            treasuryAmount -= treasuryAmt; // Revert fee
        }

        emit RoundEnded(roundId, _endPrice, prizePool, winningPosition);

        // Start next round immediately
        currentRoundId++;
        Round storage nextRound = rounds[currentRoundId];
        nextRound.startTimestamp = block.timestamp;
        nextRound.startPrice = _endPrice;

        emit RoundStarted(currentRoundId, _endPrice, block.timestamp);
    }

    /**
     * @notice Claim rewards for a specific round
     * @param roundId The round ID to claim
     */
    function claim(uint256 roundId) external {
        Round storage round = rounds[roundId];
        BetInfo storage betInfo = ledger[roundId][msg.sender];

        require(round.resolved, "Round not resolved");
        require(betInfo.amount > 0, "No bet placed");
        require(!betInfo.claimed, "Already claimed");

        uint256 payout = 0;

        // Check if user won
        bool upWon = round.endPrice > round.startPrice;
        bool userWon = (upWon && betInfo.position == Position.Up) ||
                       (!upWon && betInfo.position == Position.Down);

        if (userWon && round.rewardBaseCalAmount > 0) {
            // Calculate proportional payout
            payout = (betInfo.amount * round.rewardAmount) / round.rewardBaseCalAmount;
        } else if (round.totalUpAmount == 0 || round.totalDownAmount == 0) {
            // Refund scenario (one side empty)
            payout = betInfo.amount;
        }

        require(payout > 0, "Not eligible for payout");

        betInfo.claimed = true;
        payable(msg.sender).transfer(payout);

        emit RewardsClaimed(roundId, msg.sender, payout);
    }

    /**
     * @notice Get user's claimable amount for a round
     */
    function getClaimableAmount(uint256 roundId, address user) external view returns (uint256) {
        Round storage round = rounds[roundId];
        BetInfo storage betInfo = ledger[roundId][user];

        if (!round.resolved || betInfo.amount == 0 || betInfo.claimed) {
            return 0;
        }

        bool upWon = round.endPrice > round.startPrice;
        bool userWon = (upWon && betInfo.position == Position.Up) ||
                       (!upWon && betInfo.position == Position.Down);

        if (userWon && round.rewardBaseCalAmount > 0) {
            return (betInfo.amount * round.rewardAmount) / round.rewardBaseCalAmount;
        } else if (round.totalUpAmount == 0 || round.totalDownAmount == 0) {
            return betInfo.amount;
        }

        return 0;
    }

    /**
     * @notice Get payout multiplier for current round
     * @param isUp true for UP multiplier, false for DOWN
     */
    function getPayoutMultiplier(uint256 roundId, bool isUp) external view returns (uint256) {
        Round storage round = rounds[roundId];
        uint256 totalPool = round.totalUpAmount + round.totalDownAmount;

        if (totalPool == 0) return 0;

        uint256 winnerPool = isUp ? round.totalUpAmount : round.totalDownAmount;
        if (winnerPool == 0) return 0;

        // Calculate multiplier with 2 decimals (e.g., 150 = 1.50x)
        uint256 prizePool = (totalPool * (FEE_BASE - treasuryFee)) / FEE_BASE;
        return (prizePool * 100) / winnerPool;
    }

    /**
     * @notice Treasury claims accumulated fees
     */
    function claimTreasury() external {
        require(msg.sender == treasuryAddress, "Not treasury");
        require(treasuryAmount > 0, "No treasury funds");

        uint256 amount = treasuryAmount;
        treasuryAmount = 0;

        payable(treasuryAddress).transfer(amount);
        emit TreasuryClaimed(amount);
    }

    /**
     * @notice Get all bettors for a round
     */
    function getRoundBettors(uint256 roundId) external view returns (address[] memory) {
        return roundBettors[roundId];
    }

    /**
     * @notice Update treasury address (only current treasury)
     */
    function setTreasuryAddress(address _treasury) external {
        require(msg.sender == treasuryAddress, "Not treasury");
        treasuryAddress = _treasury;
    }

    /**
     * @notice Get round info
     */
    function getRound(uint256 roundId) external view returns (
        uint256 startTimestamp,
        int256 startPrice,
        int256 endPrice,
        bool resolved,
        uint256 totalUpAmount,
        uint256 totalDownAmount,
        uint256 rewardAmount
    ) {
        Round storage round = rounds[roundId];
        return (
            round.startTimestamp,
            round.startPrice,
            round.endPrice,
            round.resolved,
            round.totalUpAmount,
            round.totalDownAmount,
            round.rewardAmount
        );
    }
}
