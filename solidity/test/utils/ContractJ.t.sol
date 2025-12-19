// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from 'forge-std/Test.sol';
import {MockContractJ} from 'test/smock/contracts/utils/MockContractJ.sol';
import {SmockHelper} from 'test/smock/SmockHelper.sol';
import {ContractJ} from 'contracts/utils/ContractJ.sol';

contract UnitMockContractJ is Test, SmockHelper {
  address internal _owner = makeAddr('owner');
  MockContractJ internal _contractTest;

  uint256 internal _valueA = 10;
  uint256 internal _valueB = 20;
  uint256 internal _result = 40;
  ContractJ.MyUserType internal _myUserTypeA = ContractJ.MyUserType.wrap(_valueA);
  ContractJ.MyUserType internal _myUserTypeB = ContractJ.MyUserType.wrap(_valueB);
  ContractJ.MyUserType internal _myUserTypeResult = ContractJ.MyUserType.wrap(_result);

  function setUp() public {
    vm.prank(_owner);

    _contractTest = MockContractJ(deployMock('TestContractJ', type(MockContractJ).creationCode, abi.encode()));
  }

  function test_Set_MyUserTypeVariable() public {
    _contractTest.set_myUserTypeVariable(_myUserTypeA);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.myUserTypeVariable()), _valueA);
  }

  function test_Call_MyUserTypeVariable() public {
    _contractTest.mock_call_myUserTypeVariable(_myUserTypeA);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.myUserTypeVariable()), _valueA);
  }

  function test_Set_MyUserTypeArray() public {
    ContractJ.MyUserType[] memory _myUserTypeArray = new ContractJ.MyUserType[](1);
    _myUserTypeArray[0] = _myUserTypeA;

    _contractTest.set_myUserTypeArray(_myUserTypeArray);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.myUserTypeArray(0)), _valueA);
  }

  function test_Call_MyUserTypeArray() public {
    ContractJ.MyUserType[] memory _myUserTypeArray = new ContractJ.MyUserType[](1);
    _myUserTypeArray[0] = _myUserTypeA;

    _contractTest.mock_call_myUserTypeArray(0, _myUserTypeArray[0]);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.myUserTypeArray(0)), _valueA);
  }

  function test_Set_Uint256ToMyUserType() public {
    uint256 _key = 0;

    _contractTest.set_uint256ToMyUserType(_key, _myUserTypeA);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.uint256ToMyUserType(_key)), _valueA);
  }

  function test_Call_Uint256ToMyUserType() public {
    uint256 _key = 0;

    _contractTest.mock_call_uint256ToMyUserType(_key, _myUserTypeA);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.uint256ToMyUserType(_key)), _valueA);
  }

  function test_Set_Uint256ToMyUserTypeArray() public {
    uint256 _key = 0;
    ContractJ.MyUserType[] memory _myUserTypeArray = new ContractJ.MyUserType[](1);
    _myUserTypeArray[0] = _myUserTypeA;

    _contractTest.set_uint256ToMyUserTypeArray(_key, _myUserTypeArray);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.uint256ToMyUserTypeArray(_key, 0)), _valueA);
  }

  function test_Call_Uint256ToMyUserTypeArray() public {
    uint256 _key = 0;
    ContractJ.MyUserType[] memory _myUserTypeArray = new ContractJ.MyUserType[](1);
    _myUserTypeArray[0] = _myUserTypeA;

    _contractTest.mock_call_uint256ToMyUserTypeArray(_key, 0, _myUserTypeArray[0]);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.uint256ToMyUserTypeArray(_key, 0)), _valueA);
  }

  function test_Set_Add() public {
    _contractTest.mock_call_add(_myUserTypeA, _myUserTypeB, _myUserTypeResult);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.externalAdd(_myUserTypeA, _myUserTypeB)), _result);
  }

  function test_InternalAdd() public {
    _contractTest.mock_call_internalAdd(_myUserTypeA, _myUserTypeB, _myUserTypeResult);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.call_internalAdd(_myUserTypeA, _myUserTypeB)), _result);
  }

  function test_ExternalAdd() public {
    _contractTest.mock_call_externalAdd(_myUserTypeA, _myUserTypeB, _myUserTypeResult);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.externalAdd(_myUserTypeA, _myUserTypeB)), _result);
  }

  function test_InternalPureAdd() public {
    _contractTest.mock_call_internalPureAdd(_myUserTypeA, _myUserTypeB, _myUserTypeResult);
    assertEq(ContractJ.MyUserType.unwrap(_contractTest.call_internalPureAdd(_myUserTypeA, _myUserTypeB)), _result);
  }
}
