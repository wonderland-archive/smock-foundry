// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.8;

/**
 * @notice This contract is for testing user defined value types
 */
contract ContractJ {
  type MyUserType is uint256;

  MyUserType public myUserTypeVariable;

  MyUserType[] public myUserTypeArray;

  mapping(uint256 => MyUserType) public uint256ToMyUserType;

  mapping(uint256 => MyUserType[]) public uint256ToMyUserTypeArray;

  function add(MyUserType a, MyUserType b) internal view virtual returns (MyUserType) {
    return MyUserType.wrap(MyUserType.unwrap(a) + MyUserType.unwrap(b));
  }

  function internalAdd(MyUserType a, MyUserType b) internal virtual returns (MyUserType) {
    myUserTypeVariable = add(a, b);
    return myUserTypeVariable;
  }

  function externalAdd(MyUserType a, MyUserType b) external returns (MyUserType) {
    myUserTypeVariable = add(a, b);
    return myUserTypeVariable;
  }

  function internalPureAdd(MyUserType a, MyUserType b) internal pure virtual returns (MyUserType) {
    return MyUserType.wrap(MyUserType.unwrap(a) + MyUserType.unwrap(b));
  }
}
