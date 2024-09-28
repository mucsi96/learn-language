package io.github.mucsi96.learnlanguage.imports;

import java.time.ZonedDateTime;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity(name="imports")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Import {
    @Id
    long id;
    String category;
    String word;
    List<String> forms;
    java.util.List<String> examples;
    ZonedDateTime imported_at;
    java.time.ZonedDateTime processed_at;
}
