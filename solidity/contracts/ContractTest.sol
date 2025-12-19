// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IContractTest, MyContract} from '../interfaces/IContractTest.sol';

/**
 * @notice This contract is for general testing
 * @dev It contains the most common variables types and functions
 */
contract ContractTest is IContractTest {
  uint256 public immutable immutableUintVariable = 10;

  uint256 internal internalUint256;
  /// @inheritdoc IContractTest
  uint256 public uintVariable;
  /// @inheritdoc IContractTest
  string public stringVariable;
  /// @inheritdoc IContractTest
  bool public boolVariable;
  /// @inheritdoc IContractTest
  address public addressVariable;
  /// @inheritdoc IContractTest
  bytes32 public bytes32Variable;
  /// @inheritdoc IContractTest
  MyStruct public myStructVariable;
  /// @inheritdoc IContractTest
  MyEnum public myEnumVariable;
  /// @inheritdoc IContractTest
  MyContract public myContractVariable;

  address[] internal internalAddressArray;
  /// @inheritdoc IContractTest
  address[] public addressArray;
  /// @inheritdoc IContractTest
  uint256[] public uint256Array;
  /// @inheritdoc IContractTest
  bytes32[] public bytes32Array;
  /// @inheritdoc IContractTest
  MyStruct[] public myStructArray;

  mapping(uint256 => address) internal internalUint256ToAddress;
  /// @inheritdoc IContractTest
  mapping(uint256 => address) public uint256ToAddress;
  /// @inheritdoc IContractTest
  mapping(address => uint256) public addressToUint;
  /// @inheritdoc IContractTest
  mapping(bytes32 => bytes) public bytes32ToBytes;
  /// @inheritdoc IContractTest
  mapping(uint256 => MyStruct) public uint256ToMyStruct;
  /// @inheritdoc IContractTest
  mapping(uint256 => address[]) public uint256ToAddressArray;
  /// @inheritdoc IContractTest
  mapping(uint256 => MyStruct[]) public uint256ToMyStructArray;
  /// @inheritdoc IContractTest
  mapping(uint256 => mapping(address => bytes32)) public uint256ToAddressToBytes32;

  /// Constructor
  constructor(
    uint256 _uintVariable,
    string memory _stringVariable,
    bool _boolVariable,
    address _addressVariable,
    bytes32 _bytes32Variable
  ) {
    uintVariable = _uintVariable;
    stringVariable = _stringVariable;
    boolVariable = _boolVariable;
    addressVariable = _addressVariable;
    bytes32Variable = _bytes32Variable;
  }

  /// @inheritdoc IContractTest
  function setVariables(
    uint256 _newValue,
    string memory _newString,
    bool _newBool,
    address _newAddress,
    bytes32 _newBytes32,
    address[] memory _addressArray,
    uint256[] memory _uint256Array,
    bytes32[] memory _bytes32Array
  ) public returns (bool _result) {
    uintVariable = _newValue;
    stringVariable = _newString;
    boolVariable = _newBool;
    addressVariable = _newAddress;
    bytes32Variable = _newBytes32;
    addressArray = _addressArray;
    uint256Array = _uint256Array;
    bytes32Array = _bytes32Array;
    _result = true;
  }

  function setVariables(uint256 _newValue) public returns (bool _result) {
    uintVariable = _newValue;
    _result = true;
  }

  function setVariables(uint256 _newValue, bool) public returns (bool _result) {
    uintVariable = _newValue;
    _result = true;
  }

  function setStructVariable(MyStruct memory _myStruct) public returns (bool _result) {
    myStructVariable = _myStruct;
    _result = true;
  }

  function internalVirtualFunction(uint256 _newValue)
    internal
    virtual
    returns (bool _result, uint256 _value, string memory _string)
  {
    internalUint256 = _newValue;
    _result = true;
    _value = 1;
    _string = 'test';
  }

  function internalViewVirtualFunction(uint256 _newValue)
    internal
    view
    virtual
    returns (bool _result, uint256 _value, string memory _string)
  {
    _result = true;
    _value = 1;
    _string = 'test';
  }

  function internalPureVirtualFunction(uint256 _newValue)
    internal
    pure
    virtual
    returns (bool _result, uint256 _value, string memory _string)
  {
    _result = true;
    _value = _newValue;
    _string = 'test';
  }

  function internalNonVirtualFunction(
    uint256 _newValue,
    bool
  ) internal returns (bool _result, uint256 _value, string memory _string) {
    internalUint256 = _newValue;
    _result = true;
    _value = 1;
    _string = 'test';
  }

  function internalPureVirtualFunctionWithStruct(MyStruct memory _myStruct)
    internal
    pure
    virtual
    returns (MyStruct memory)
  {
    return _myStruct;
  }

  function testFunc(uint256) public pure returns (bool) {
    return true;
  }

  // ========================= View =========================

  function getInternalUint256() public view returns (uint256) {
    return internalUint256;
  }

  function getInternalAddressArray() public view returns (address[] memory) {
    return internalAddressArray;
  }

  function getInternalUint256ToAddress(uint256 _index) public view returns (address) {
    return internalUint256ToAddress[_index];
  }

  // =============== virtual call ===============

  function callInternalVirtualFunction(uint256 _newValue)
    public
    returns (bool _result, uint256 _value, string memory _string)
  {
    (_result, _value, _string) = internalVirtualFunction(_newValue);
  }

  function callInternalViewVirtualFunction(uint256 _newValue)
    public
    view
    returns (bool _result, uint256 _value, string memory _string)
  {
    (_result, _value, _string) = internalViewVirtualFunction(_newValue);
  }

  function callInternalPureVirtualFunction(uint256 _newValue)
    public
    pure
    returns (bool _result, uint256 _value, string memory _string)
  {
    (_result, _value, _string) = internalPureVirtualFunction(_newValue);
  }
}
