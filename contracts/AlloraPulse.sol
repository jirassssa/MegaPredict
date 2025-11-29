// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AlloraPulse - AI Prediction Market
 * @notice Follow AI or Against AI prediction market for ETH/USDT
 * @dev Inspired by Allora x PancakeSwap prediction market
 */
contract AlloraPulse {
    enum Position { None, FollowAI, AgainstAI }
    enum AIPrediction { None, Up, Down }

    struct Round {
        uint256 roundNumber;
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;        // ETH price at round start (8 decimals)
        int256 endPrice;          // ETH price at round end
        AIPrediction aiPrediction; // AI's prediction (Up or Down)
        uint256 aiConfidence;     // AI confidence 0-100
        bool resolved;
        uint256 totalFollowAI;    // Total ETH bet on Follow AI
        uint256 totalAgainstAI;   // Total ETH bet on Against AI
        uint256 rewardAmount;     // Prize pool after fee
    }

    struct Bet {
        Position position;
        uint256 amount;
        bool claimed;
    }

    uint256 public currentRoundNumber;
    uint256 public roundDuration = 15 minutes;
    uint256 public treasuryFee = 200; // 2% (200/10000)
    uint256 public constant FEE_BASE = 10000;

    address public operator; // Can start/resolve rounds
    address public treasury;
    uint256 public treasuryAmount;

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Bet)) public ledger;

    event RoundStarted(
        uint256 indexed roundNumber,
        uint256 startTime,
        int256 startPrice,
        AIPrediction aiPrediction,
        uint256 aiConfidence
    );

    event BetPlaced(
        uint256 indexed roundNumber,
        address indexed user,
        Position position,
        uint256 amount
    );

    event RoundEnded(
        uint256 indexed roundNumber,
        int256 endPrice,
        bool aiWasCorrect,
        Position winningPosition
    );

    event Claimed(
        uint256 indexed roundNumber,
        address indexed user,
        uint256 amount
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor() {
        operator = msg.sender;
        treasury = msg.sender;
        currentRoundNumber = 0;
    }

    /**
     * @notice Start a new round with AI prediction
     * @param _startPrice Current ETH/USDT price (8 decimals)
     * @param _aiPrediction AI's prediction (1=Up, 2=Down)
     * @param _aiConfidence AI confidence percentage (0-100)
     */
    function startRound(
        int256 _startPrice,
        uint8 _aiPrediction,
        uint256 _aiConfidence
    ) external onlyOperator {
        require(_aiPrediction == 1 || _aiPrediction == 2, "Invalid AI prediction");
        require(_aiConfidence <= 100, "Invalid confidence");

        // If there's a previous round, it must be resolved
        if (currentRoundNumber > 0) {
            require(rounds[currentRoundNumber].resolved, "Previous round not resolved");
        }

        currentRoundNumber++;

        Round storage round = rounds[currentRoundNumber];
        round.roundNumber = currentRoundNumber;
        round.startTime = block.timestamp;
        round.endTime = block.timestamp + roundDuration;
        round.startPrice = _startPrice;
        round.aiPrediction = _aiPrediction == 1 ? AIPrediction.Up : AIPrediction.Down;
        round.aiConfidence = _aiConfidence;
        round.resolved = false;

        emit RoundStarted(
            currentRoundNumber,
            block.timestamp,
            _startPrice,
            round.aiPrediction,
            _aiConfidence
        );
    }

    /**
     * @notice Place a bet - Follow AI or Against AI
     * @param followAI true to follow AI, false to bet against AI
     */
    function placeBet(bool followAI) external payable {
        uint256 roundNumber = currentRoundNumber;
        Round storage round = rounds[roundNumber];

        require(roundNumber > 0, "No active round");
        require(msg.value > 0, "Bet amount must be > 0");
        require(!round.resolved, "Round already ended");
        require(block.timestamp < round.endTime, "Betting period over");
        require(ledger[roundNumber][msg.sender].amount == 0, "Already bet");

        Position position = followAI ? Position.FollowAI : Position.AgainstAI;

        ledger[roundNumber][msg.sender] = Bet({
            position: position,
            amount: msg.value,
            claimed: false
        });

        if (followAI) {
            round.totalFollowAI += msg.value;
        } else {
            round.totalAgainstAI += msg.value;
        }

        emit BetPlaced(roundNumber, msg.sender, position, msg.value);
    }

    /**
     * @notice Resolve round with ending price
     * @param _roundNumber Round to resolve
     * @param _endPrice ETH/USDT price at round end (8 decimals)
     */
    function resolveRound(uint256 _roundNumber, int256 _endPrice) external onlyOperator {
        Round storage round = rounds[_roundNumber];

        require(!round.resolved, "Already resolved");
        require(block.timestamp >= round.endTime, "Round not ended yet");
        require(round.totalFollowAI > 0 || round.totalAgainstAI > 0, "No bets");

        round.endPrice = _endPrice;
        round.resolved = true;

        // Determine actual price movement
        bool priceWentUp = _endPrice >= round.startPrice;

        // Check if AI was correct
        bool aiWasCorrect = (priceWentUp && round.aiPrediction == AIPrediction.Up) ||
                           (!priceWentUp && round.aiPrediction == AIPrediction.Down);

        // Winner is those who followed AI if AI was correct, otherwise against AI
        Position winningPosition = aiWasCorrect ? Position.FollowAI : Position.AgainstAI;

        // Calculate prize pool
        uint256 totalPool = round.totalFollowAI + round.totalAgainstAI;
        uint256 fee = (totalPool * treasuryFee) / FEE_BASE;
        treasuryAmount += fee;

        round.rewardAmount = totalPool - fee;

        // Handle edge case: one side has no bets
        if (round.totalFollowAI == 0 || round.totalAgainstAI == 0) {
            round.rewardAmount = totalPool; // Full refund
            treasuryAmount -= fee; // No fee
        }

        emit RoundEnded(_roundNumber, _endPrice, aiWasCorrect, winningPosition);
    }

    /**
     * @notice Claim winnings for a round
     * @param _roundNumber Round to claim from
     */
    function claim(uint256 _roundNumber) external {
        Round storage round = rounds[_roundNumber];
        Bet storage bet = ledger[_roundNumber][msg.sender];

        require(round.resolved, "Round not resolved");
        require(bet.amount > 0, "No bet placed");
        require(!bet.claimed, "Already claimed");

        // Determine if AI was correct
        bool priceWentUp = round.endPrice >= round.startPrice;
        bool aiWasCorrect = (priceWentUp && round.aiPrediction == AIPrediction.Up) ||
                           (!priceWentUp && round.aiPrediction == AIPrediction.Down);

        // Check if user won
        bool userWon = (aiWasCorrect && bet.position == Position.FollowAI) ||
                      (!aiWasCorrect && bet.position == Position.AgainstAI);

        uint256 payout = 0;

        if (userWon) {
            uint256 winnerPool = aiWasCorrect ? round.totalFollowAI : round.totalAgainstAI;
            if (winnerPool > 0) {
                payout = (bet.amount * round.rewardAmount) / winnerPool;
            }
        } else if (round.totalFollowAI == 0 || round.totalAgainstAI == 0) {
            // Refund if one side empty
            payout = bet.amount;
        }

        require(payout > 0, "Not eligible for payout");

        bet.claimed = true;
        payable(msg.sender).transfer(payout);

        emit Claimed(_roundNumber, msg.sender, payout);
    }

    /**
     * @notice Get claimable amount for user in a round
     */
    function getClaimable(uint256 _roundNumber, address _user)
        external
        view
        returns (uint256)
    {
        Round storage round = rounds[_roundNumber];
        Bet storage bet = ledger[_roundNumber][_user];

        if (!round.resolved || bet.amount == 0 || bet.claimed) {
            return 0;
        }

        bool priceWentUp = round.endPrice >= round.startPrice;
        bool aiWasCorrect = (priceWentUp && round.aiPrediction == AIPrediction.Up) ||
                           (!priceWentUp && round.aiPrediction == AIPrediction.Down);

        bool userWon = (aiWasCorrect && bet.position == Position.FollowAI) ||
                      (!aiWasCorrect && bet.position == Position.AgainstAI);

        if (userWon) {
            uint256 winnerPool = aiWasCorrect ? round.totalFollowAI : round.totalAgainstAI;
            if (winnerPool > 0) {
                return (bet.amount * round.rewardAmount) / winnerPool;
            }
        } else if (round.totalFollowAI == 0 || round.totalAgainstAI == 0) {
            return bet.amount;
        }

        return 0;
    }

    /**
     * @notice Get payout multiplier for a position
     */
    function getPayoutMultiplier(uint256 _roundNumber, bool followAI)
        external
        view
        returns (uint256)
    {
        Round storage round = rounds[_roundNumber];
        uint256 totalPool = round.totalFollowAI + round.totalAgainstAI;

        if (totalPool == 0) return 0;

        uint256 positionPool = followAI ? round.totalFollowAI : round.totalAgainstAI;
        if (positionPool == 0) return 0;

        uint256 prizePool = (totalPool * (FEE_BASE - treasuryFee)) / FEE_BASE;
        return (prizePool * 100) / positionPool; // Returns multiplier * 100
    }

    /**
     * @notice Claim treasury fees
     */
    function claimTreasury() external {
        require(msg.sender == treasury, "Not treasury");
        require(treasuryAmount > 0, "No funds");

        uint256 amount = treasuryAmount;
        treasuryAmount = 0;

        payable(treasury).transfer(amount);
    }

    /**
     * @notice Update operator address
     */
    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }

    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external {
        require(msg.sender == treasury, "Not treasury");
        treasury = _treasury;
    }

    /**
     * @notice Get round details
     */
    function getRound(uint256 _roundNumber)
        external
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            int256 startPrice,
            int256 endPrice,
            AIPrediction aiPrediction,
            uint256 aiConfidence,
            bool resolved,
            uint256 totalFollowAI,
            uint256 totalAgainstAI,
            uint256 rewardAmount
        )
    {
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
}
