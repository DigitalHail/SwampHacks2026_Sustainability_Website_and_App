import { Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
};

export function Button({ title, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-3 bg-black rounded-xl"
    >
      <Text className="text-white font-semibold">{title}</Text>
    </Pressable>
  );
}
